# Project: URL Shortener Microservice and API 


# Introduction

An application that takes in a URL at an API endpoint and returns the short version after DNS evaluation.


## Technologies

- JavaScript(ECMAScript 2015)

- NodeJS

- ExpressJS

- DNS Module

- MONGODB


## URL SHORTENER -  How it works

1. I can POST a URL to `https://reagan-urlshort.glitch.me/api/shorturl/new` and I will receive a shortened URL in the JSON response. Example : `{"original_url":"www.google.com","short_url":1}`
2. If I pass an invalid URL that doesn't follow the valid `http(s)://www.example.com(/more/routes)` format, the JSON response will contain an error like `{"error":"invalid URL"}`.
3. When I visit the shortened URL, it will redirect me to my original link.



## Made on [Glitch](https://glitch.com/)


