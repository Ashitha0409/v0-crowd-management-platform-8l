import requests
response = requests.post('http://localhost:5000/api/demo/populate')
print(response.json())
