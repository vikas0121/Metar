// grab the packages we need
const express = require("express");
const bodyParser = require('body-parser');
const request = require("request");
const responseTime = require('response-time')
const redis = require('redis');
const app = express();
// create and connect redis client to local instance.
const client = redis.createClient();
const port = process.env.PORT || 8080;

//middleware
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
})); // support encoded bodies
// use response-time as a middleware
app.use(responseTime());


app.get("/metar/ping", (req, res) => res.send({
    'data': 'pong'
}));


// app.get('/metar', function (req, res) {
//     console.log('req');
//     // request(searchUrl, function (error, response, body) {
//     //     console.log('error:', error); // Print the error if one occurred
//     //     console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//     //     console.log('body:', body); // Print the HTML for the Google homepage.
//     //     res.sendStatus(response.statusCode);
//     // });

//     // Try fetching the result from Redis first in case we have it cached
//     return client.get(`wikipedia:${query}`, (err, result) => {
//         // If that key exist in Redis store
//         if (result) {
//             const resultJSON = JSON.parse(result);
//             return res.status(200).json(resultJSON);
//         } else { // Key does not exist in Redis store
//             // Fetch directly from Metar API
//             return axios.get(searchUrl)
//                 .then(response => {
//                     const responseJSON = response.data;
//                     // Save the Metar API response in Redis store
//                     client.setex(`wikipedia:${query}`, 3600, JSON.stringify({
//                         source: 'Redis Cache',
//                         ...responseJSON,
//                     }));
//                     // Send JSON response to client
//                     return res.status(200).json({
//                         source: 'Metar API',
//                         ...responseJSON,
//                     });
//                 })
//                 .catch(err => {
//                     return res.json(err);
//                 });
//         }
//     });
// });

app.get('/metar/info', function (req, res) {
    console.log(req.query.noncache);
    if (req.query.noncache == '1') {
        fetchFromDB(req.query.scode, res);
    } else {
        client.get(req.query.scode, function (error, product) {
            if (error) {
                throw error;
            }
            if (product) {
                console.log('inside cache');
                console.log(product);
                res.json(JSON.parse(product));
            } else {
                fetchFromDB(req.query.scode, res);
            }
        });
    }
});

function fetchFromDB(params, res) {
    request({
        uri: 'https://tgftp.nws.noaa.gov/data/observations/metar/stations/' + params + '.TXT'
    }, function (error, response, body) {
        if (error) {
            throw error;
        }
        console.log('inside function');
        console.log(body);
        if (!error && response.statusCode === 200) {
            res.json(body);
            client.set(params, JSON.stringify(body), 'EX', 300, function (error) {
                if (error) {
                    console.log(error);
                    throw error;
                }
            });
        } else {
            res.send(response.statusCode);
        }
    });
}



// start the server
app.listen(port, () => console.log(`Example app listening on port ${port}!`));