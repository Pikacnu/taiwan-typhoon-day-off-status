import pandas as pd

schools = pd.read_excel('./schools/data.xlsx')

test = schools.loc[:,["學校名稱","經度","緯度"]]

#rename columns
test.columns = ["name","lng","lat"]

#to json file
test.to_json('./schools/test.json',orient='records',force_ascii=False)