import requests
import os
import json


BASE_URL = "https://newsapi.org/v2/everything"

def fetch_cyber_news():
    """Fetch latest cybersecurity news from NewsAPI.org"""
    params = {
        "q": "cybersecurity",
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 10,
        "apiKey": "API_KEY",
    }

    response = requests.get(BASE_URL, params=params)
    response.raise_for_status()
    return response.json()


# def fetch_report():
#     data = {
#     "contents": [
#         {
#             "parts": [
#                 {"text": "explain people in short."}
#             ]
#         }
#     ]
# }


#     url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAxeo9ZS5MQrYyp7gfsBm4T7PgWaA_Lu2A"

#     response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(data))
#     response.raise_for_status()
#     return response.json()




# import requests
# 
# import os

# # Get your API key (it's best to use an environment variable)
# api_key = os.getenv("GEMINI_API_KEY")

# if not api_key:
#     raise ValueError("GEMINI_API_KEY environment variable not set.")

# # Define the endpoint URL

# # Define the request body with your prompt

# # Send the POST request
# response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(data))

# # Check if the request was successful
# if response.status_code == 200:
#     # Parse the JSON response
#     response_data = response.json()
    
#     # Extract and print the generated text
#     try:
#         generated_text = response_data['candidates'][0]['content']['parts'][0]['text']
#         print(generated_text)
#     except (KeyError, IndexError) as e:
#         print(f"Error parsing response: {e}")
#         print("Raw response:", response.text)
# else:
#     print(f"Error: {response.status_code}")
#     print(response.text)


# Please install OpenAI SDK first: `pip3 install openai`

# from openai import OpenAI

# client = OpenAI(api_key="<DeepSeek API Key>", base_url="https://api.deepseek.com")

# response = client.chat.completions.create(
#     model="deepseek-chat",
#     messages=[
#         {"role": "system", "content": "You are a helpful assistant"},
#         {"role": "user", "content": "Hello"},
#     ],
#     stream=False
# )

# print(response.choices[0].message.content)