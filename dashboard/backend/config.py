import pandas as pd


file_path = 'data/2022_aus_elections_mar_to_may_29_persuasion_party_tokenized.csv'

election_day = pd.Timestamp('2022-05-21')
default_start_date = pd.Timestamp('2022-02-27')
default_end_date = pd.Timestamp('2022-06-01')

australian_regions = ['New South Wales', 'Victoria', 'Queensland', 'Western Australia',
                      'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'] # Jarvis Bay Territory is not included


party_mapping = {   
    "Labor Party": "Labor",
    "Liberal Coalition": "Liberal",
    "Greens Party": "Greens",
    "Independents": "Independents",
    "Other Parties": "Other",
    "No Party Affiliation": "No_Affiliation"
}