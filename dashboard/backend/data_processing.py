import pickle
import pandas as pd
import os
import sys
PROJ_ROOT = os.path.abspath(os.path.join(os.pardir))
sys.path.append(PROJ_ROOT)

from util import assign_macro_party, get_daily_data, safe_eval

def read_data(file_path, start_date, end_date):

    df = pd.read_csv(file_path)
    
    if 'Unnamed: 0' in df.columns:
        df.drop(columns=['Unnamed: 0'], inplace=True)
        
        
    df['ad_creation_time'] = pd.to_datetime(df['ad_creation_time'])
    df['ad_delivery_start_time'] = pd.to_datetime(df['ad_delivery_start_time'])
    df['ad_delivery_stop_time'] = pd.to_datetime(df['ad_delivery_stop_time'], errors='coerce')  # Coerce errors for NaNs

    df['tokenized_text'] = df['tokenized_text'].apply(safe_eval)
    df['demographic_distribution'] = df['demographic_distribution'].apply(safe_eval)
    df['region_distribution'] = df['region_distribution'].apply(safe_eval)
    df['sentences'] = df['sentences'].apply(safe_eval)
    df['sentence_confidence_scores'] = df['sentence_confidence_scores'].apply(safe_eval)


    # Drop rows where ad_delivery_stop_time or ad_delivery_start_time is missing
    df = df.dropna(subset=['ad_delivery_stop_time', 'ad_delivery_start_time'])
    # drop ads where the ad_creative_link_caption is atsijobs.com.au
    #df = df[df['ad_creative_link_caption'] != 'atsijobs.com.au']
    # drop ads where the page_name is Indigenous Employment Australia
    #df = df[df['page_name'] != 'Indigenous Employment Australia']
    df = df[(df['ad_delivery_start_time'] >= start_date) & (df['ad_delivery_stop_time'] <= end_date)]

    # drop columns with more than 70% missing values
    threshold = 0.7 # TODO Maybe this is the reason we are deleting some UAP ads.
    df = df.loc[:, df.isnull().mean() < threshold]

    # Create new columns for filtering
    df['high_persuasive'] = df['persuasive_ratio'] > 0.8
    df['low_persuasive'] = df['persuasive_ratio'] < 0.2
    df['medium_persuasive'] = ~(df['high_persuasive'] | df['low_persuasive'])
    df['persuasiveness'] = df['persuasive_ratio'].apply(lambda x: 'High' if x > 0.8 else 'Low' if x < 0.2 else 'Other')
    df['macro_party'] = df.apply(assign_macro_party, axis=1)
    df['has_party'] = df['macro_party'].notnull()
    # main party when macro_party is not null and not 'Other'
    df['is_main_party'] = df['macro_party'].notnull() & (df['macro_party'] != 'Other') & (df['macro_party'] != 'UAP') 

    return df


def make_demographics_df(df, force_reprocess=False, cache_file='data/demographics_df_cache.pkl'):
    if not force_reprocess and os.path.exists(cache_file):
        print(f'Loading demographics df from cache')
        with open(cache_file, 'rb') as f:
            return pickle.load(f)

    print(f'Making demographics df')
    df_demographics = df[df['demographic_distribution'].notnull()].copy()
    df_demographics = df_demographics[['id', 'demographic_distribution', 'mean_impressions', 'ad_delivery_start_time', 'ad_delivery_stop_time', 'macro_party', 'high_persuasive', 'low_persuasive']]
    df_demographics = df_demographics.explode('demographic_distribution')
    # Convert dictionary entries into separate columns
    df_demographics = pd.concat([df_demographics.drop(['demographic_distribution'], axis=1),
                                 df_demographics['demographic_distribution'].apply(pd.Series)], axis=1)

    df_demographics = df_demographics[df_demographics['age'] != '13-17']
    df_demographics = df_demographics[df_demographics['gender'] != 'unknown']
    df_demographics['percentage'] = df_demographics['percentage'].astype(float)

    age_order = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
    df_demographics['age'] = pd.Categorical(df_demographics['age'], categories=age_order, ordered=True)

    # Save the processed dataframe to cache
    with open(cache_file, 'wb') as f:
        pickle.dump(df_demographics, f)

    print(f'Demographics df is Ready')

    return df_demographics


# def prepare_data_for_timeseries_api(df):
#     print('Preparing data for time series API')
#     processed_data = {}
    
#     # Get unique values of macro_party, including None
#     unique_parties = df['macro_party'].unique()
    
#     for party in unique_parties:
#         if pd.isna(party): # TODO make sure this works, otherwise put None
#             party_df = df[df['macro_party'].isna()]
#             key = 'No_Affiliation'
#         else:
#             party_df = df[df['macro_party'] == party]
#             key = party
        
#         daily_data = get_daily_data(party_df)
#         processed_data[key] = daily_data
    
#     # Add an 'all' key for the entire dataset
#     processed_data['All'] = get_daily_data(df)

#     print('Data is ready for time series API')
    
#     return processed_data


def prepare_data_for_timeseries_api(df, force_reprocess=False, cache_file='data/timeseries_data_cache.pkl'):
    if not force_reprocess and os.path.exists(cache_file):
        print('Loading time series data from cache')
        with open(cache_file, 'rb') as f:
            return pickle.load(f)

    print('Preparing data for time series API')
    processed_data = {}
    
    # Get unique values of macro_party, including None
    unique_parties = df['macro_party'].unique()
    
    for party in unique_parties:
        if pd.isna(party):
            party_df = df[df['macro_party'].isna()]
            key = 'No_Affiliation'
        else:
            party_df = df[df['macro_party'] == party]
            key = party
        
        daily_data = get_daily_data(party_df)
        processed_data[key] = daily_data
    
    # Add an 'all' key for the entire dataset
    processed_data['All'] = get_daily_data(df)
    
    # Save the processed data to cache
    with open(cache_file, 'wb') as f:
        pickle.dump(processed_data, f)

    print('Data is ready for time series API')
    
    return processed_data