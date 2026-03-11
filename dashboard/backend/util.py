import ast
from datetime import datetime
import pandas as pd
import config


def clean_string(name):
    if name.startswith('df_'):
        return name[3:].capitalize()
    elif name.endswith('_df'):
        return name[:-3].capitalize()
    else:
        return name.capitalize()
    
def safe_eval(x):
        if pd.isna(x) or x == '':
            return None
        try:
            return ast.literal_eval(x)
        except (ValueError, SyntaxError):
            return None


def assign_macro_party(row):
    """
    Assigns a macro party to each row based on the party column.
    Returns 'Other' for known parties not in main categories,
    keeps null values as is, and assigns main parties as before.
    """
    if pd.isnull(row['party']):
        return 'No_Affiliation'
    elif row['party'] in ['Liberal', 'Liberal Nationals (QLD)', 'Nationals', 'Country Liberal (NT)', 'New Liberals']:
        return 'Liberal'
    elif row['party'] == 'Labor':
        return 'Labor'
    elif row['party'] == 'Greens':
        return 'Greens'
    elif row['party'] == 'Independent':
        return 'Independents'
    else:
        return 'Other'

def expand_rows_spreading_spend(row):
    days = pd.date_range(start=row['ad_delivery_start_time'], end=row['ad_delivery_stop_time'])
    days_count = len(days)
    expanded_df = pd.DataFrame({
        'date': days,
        'mean_spend': row['mean_spend'] / days_count,  # Distribute spend evenly
        'mean_impressions': row['mean_impressions'] / days_count,
        'spend.lower_bound': row['spend.lower_bound'] / days_count,
        'spend.upper_bound': row['spend.upper_bound'] / days_count,
        'impressions.lower_bound': row['impressions.lower_bound'] / days_count,
        'impressions.upper_bound': row['impressions.upper_bound'] / days_count,
        'ad_id': row['id'],
        'high_persuasive': row['high_persuasive'], # new
        'low_persuasive': row['low_persuasive'], # new
        'macro_party': row['macro_party'] # new
    })
    
    return expanded_df


def get_daily_data(df):
    # Apply the function to each row and concatenate the results
    expanded_df = pd.concat([expand_rows_spreading_spend(row) for _, row in df.iterrows()])
    
    # Pre-calculate high and low persuasive values
    expanded_df['high_persuasive_impressions'] = expanded_df['mean_impressions'] * expanded_df['high_persuasive']
    expanded_df['low_persuasive_impressions'] = expanded_df['mean_impressions'] * expanded_df['low_persuasive']
    expanded_df['high_persuasive_spend'] = expanded_df['mean_spend'] * expanded_df['high_persuasive']
    expanded_df['low_persuasive_spend'] = expanded_df['mean_spend'] * expanded_df['low_persuasive']
    
    # Aggregate the expanded DataFrame by date
    daily_data = expanded_df.groupby('date', observed=False).agg({
        'mean_impressions': 'sum',
        'high_persuasive_impressions': 'sum',
        'low_persuasive_impressions': 'sum',
        'mean_spend': 'sum',
        'high_persuasive_spend': 'sum',
        'low_persuasive_spend': 'sum'
    })
    
    # Rename columns for consistency
    daily_data.columns = [
        'mean_impressions_total',
        'mean_impressions_high_persuasive',
        'mean_impressions_low_persuasive',
        'mean_spend_total',
        'mean_spend_high_persuasive',
        'mean_spend_low_persuasive'
    ]
    
    # Calculate the 3-day moving averages
    for col in daily_data.columns:
        daily_data[f'{col}_ma3'] = daily_data[col].rolling(window=3).mean()
    
    return daily_data

# def get_daily_data(df): 1st version
#     # Apply the function to each row and concatenate the results
#     expanded_df = pd.concat([expand_rows_spreading_spend(row) for index, row in df.iterrows()])
    
#     # Aggregate the expanded DataFrame by day
#     daily_data = expanded_df.groupby('date').agg({
#         'mean_spend': 'sum',
#         'mean_impressions': 'sum',
#         'spend.lower_bound': 'sum',
#         'spend.upper_bound': 'sum',
#         'impressions.lower_bound': 'sum',
#         'impressions.upper_bound': 'sum',
#         'ad_id': 'count'
#     }).rename(columns={'ad_id': 'ad_count'})
    
#     # Calculate the 3-day moving averages for all relevant metrics
#     metrics = ['mean_spend', 'mean_impressions', 'ad_count', 
#                'spend.lower_bound', 'spend.upper_bound', 
#                'impressions.lower_bound', 'impressions.upper_bound']
    
#     for metric in metrics:
#             daily_data[f'{metric}_ma3'] = daily_data[metric].rolling(window=3).mean()
        
#     return daily_data





# TODO refactor after moving default dates to a config file so they are not taken as a parameter.
def get_and_validate_dates(start_date_str, end_date_str):
    
    if not start_date_str and not end_date_str:
        print("Using default start and end dates.")
        return config.default_start_date, config.default_end_date, None, 200
    

    if not start_date_str:
        print("Using default start date.")
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
            return config.default_start_date, end_date, None, 200
        except ValueError:
            return None, None, {"error": "Invalid date format. Use YYYY-MM-DD"}, 400
        
    if not end_date_str:
        print("Using default end date.")
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            return start_date, config.default_end_date, None, 200
        except ValueError:
            return None, None, {"error": "Invalid date format. Use YYYY-MM-DD"}, 400
        
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
    except ValueError:
        return None, None, {"error": "Invalid date format. Use YYYY-MM-DD"}, 400

    if start_date > end_date:
            return None, None, {"error": "Start date cannot be after end date"}, 400
    
    return start_date, end_date, None, 200



def apply_date_interval(data, start_date, end_date):
    """
    Filters DataFrame(s) based on a given date interval.

    This function applies a date filter to either a single DataFrame or a dictionary
    of DataFrames. It filters rows where 'ad_delivery_start_time' is greater than or
    equal to start_date and 'ad_delivery_stop_time' is less than or equal to end_date.

    Args:
        data (Union[pd.DataFrame, Dict[str, pd.DataFrame]]): The input data to be filtered.
            Can be either a single DataFrame or a dictionary of DataFrames.
        start_date (str): The start date of the interval (inclusive).
        end_date (str): The end date of the interval (inclusive).

    Returns:
        Union[pd.DataFrame, Dict[str, pd.DataFrame]]: Filtered data of the same type as input.
            If input is a DataFrame, returns a filtered DataFrame.
            If input is a dictionary, returns a dictionary with filtered DataFrames.

    Raises:
        TypeError: If the input is neither a DataFrame nor a dictionary of DataFrames.

    Example:
        >>> df = pd.DataFrame({
        ...     'ad_delivery_start_time': ['2023-01-01', '2023-01-15', '2023-02-01'],
        ...     'ad_delivery_stop_time': ['2023-01-10', '2023-01-25', '2023-02-10']
        ... })
        >>> result = apply_date_interval(df, '2023-01-01', '2023-01-31')
        >>> print(result)
    """
    if isinstance(data, dict):
        return {key: df[(df['ad_delivery_start_time'] >= start_date) & (df['ad_delivery_stop_time'] <= end_date)]
                for key, df in data.items()}
    elif isinstance(data, pd.DataFrame):
        return data[(data['ad_delivery_start_time'] >= start_date) & (data['ad_delivery_stop_time'] <= end_date)]
    else:
        raise TypeError("Input must be a DataFrame or a dictionary of DataFrames")
    

def calculate_gender_impressions(dataframe):
    gender_impressions = dataframe.groupby('gender', observed=False).apply(
        lambda x: (x['mean_impressions'] * x['percentage']).sum()
    ).to_dict()
    
    return {
        'male': round(gender_impressions.get('male', 0)),
        'female': round(gender_impressions.get('female', 0))
    }

def calculate_age_impressions(dataframe):
    age_impressions = dataframe.groupby('age', observed=False).apply(
        lambda x: (x['mean_impressions'] * x['percentage']).sum()
    ).to_dict()
    
    return {
        age_group: round(impressions)
        for age_group, impressions in age_impressions.items()
    }
