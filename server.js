"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dns = require("dns");
const url = require("url");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const session = require("express-session");
var cors = require("cors");

const urlModel = require("./models/urlsModel");
const usersModel = require("./models/usersModel");
const { usersRoute, getExpiryDays } = require("./routes/users");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

// mongoose.connect(process.env.DB_URI);
mongoose
  .connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => {
    console.log(`Mongo DB connected`);
  })
  .catch(err => console.log(err));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);

//Middlewares

// - sessions
app.use(
  session({
    cookie: {
      sameSite: "none",
      secure: false,
    },
    secret: "goodstuff",
    resave: false,
    saveUninitialized: false
  })
);


// - authentication
app.use(passport.initialize());
app.use(passport.session());
require("./passportConfig")(passport);

//routes
//const usersRoute = require("./routes/users");
app.use("/users", usersRoute);

//Regex
const urlReg = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
const shortUrlReg = /([a-z0-9])+/;
const protocolRegex = /^(?:(?:https?|ftp):\/\/)/;
/*
Save the protocol to db if it exists
If it does not...add http to it and save to db

*/

//var url;

//Functions

//serve static files
app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});
//for a random string, create a string of all the letters and numbers and generate random like
//from an array

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function makeShort(length) {
  var result = "";
  let characters = "abcdefghijklmnopqrstuvwxyz01234567890";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

const protocolHandler = url => {
  let defaultProtocol = "http://";

  if (protocolRegex.test(url)) {
    let urlProtocol = url.match(protocolRegex).toString();
    return urlProtocol;
  }
  return defaultProtocol;
};

//Clean URL for dns lookup
const addUrlPrococol = url => {
  let defaultProtocol = "http://";
  if (protocolRegex.test(url)) {
    let urlProtocol = url.match(protocolRegex).toString();
    return url;
  }
  return defaultProtocol + url;
};

//Remove last / on url
const extract = url => {
  let lastCharacter = url[url.length - 1];
  if (lastCharacter === "/") {
    return url.slice(0, -1);
  }
  return url;
};

const checkShort = callback => {
  let shortUrl = makeShort(4);

  urlModel.findOne({ shorturl: shortUrl }).then(doc => {
    if (!doc || doc.length === 0) {
      callback(shortUrl);
    } else {
      checkShort(callback);
      console.log("there " + shortUrl);
    }
  });
};

//console.log(foundUrl("www.reagan.com"))

//find expired user link and return true/false

const linkActive = daysRemaining => {
  if (daysRemaining < 0) {
    return false;
  }
  return true;
};

//check if link exists on user - helper function
const linkExists = (linkArray, id) => {
  //let newId = mongoose.Types.ObjectId(id)
  for (let link of linkArray) {
    if (link._id === id.toString()) {
      return true;
    }
  }
  return false;
};

//update links to user model - helper function
const updateUserLinks = (linkid, res, name) => {
  var link = { _id: linkid };

  usersModel.findOne({ userName: name }).then(doc => {
    if (!doc || doc.length === 0) {
      console.log("here");
    } else {
      console.log(linkExists(doc.linksShortened, linkid));
      if (!linkExists(doc.linksShortened, linkid)) {
        usersModel
          .findOneAndUpdate(
            { userName: name },
            {
              $push: { linksShortened: link }
            },
            { new: true }
          )
          .then(doc => {
            if (doc || doc.length > 0) {
              return console.log({ msg: "successful" });
            } else {
              return console.log({ err: "user not found" });
            }
          })
          .catch(err => res.status(500).json(err));
      }
    }
  });
};

// Find the url object in array and update its custom field - helper function
const updateCustomLink = (res, id, array, customUrl) => {
  for (let item of array) {
    if (item._id === id) {
      item.custom = customUrl;
      res.send(item);
    }
  }
};

/* Get the original shorturl from custom - helper functions */

//search for the custom name in the array of urls and return its id
const getLinkId = (array, unique) => {
  const url = array.filter(item => {
    return item.custom === unique || item.shorturl === unique;
  });
  //console.log(...url);
  if (url.length !== 0) {
    return url[0]._id;
  }
  return false;
};

//use id to find the original short url
const getOriginalShort = (id, callback) => {
  urlModel.findOne({ _id: id }).then(doc => {
    if (!doc || doc.length === 0) {
      callback(false);
    } else {
      callback(doc);
    }
  });
};
//get array with the custom

//get linkid from just custom
const getCustomDoc = async (custom, callback) => {
  let linkId = "";
  let linkArray = [];
  usersModel.find({}).then(doc => {
    for (let user of doc) {
      linkArray.push(...user.linksShortened);
    }
    linkId = getLinkId(linkArray, custom);
    if (linkId) {
      getOriginalShort(linkId, doc => {
        callback(doc);
      });
    } else {
      callback(false);
    }
  });
};
//getlinkId for non-custom urls

//GetUser of link
const getUserInfoFromLink = (input, callback, id) => {
  usersModel.find({}).then(doc => {
    for (let user of doc) {
      for (let link of user.linksShortened) {
        if (link.custom) {
          if (link.custom === input) {
            // console.log({custom: link.custom, input: input})
            callback(link.createdAt, user.linksExpiry);
          }
        }
        if (id) {
          if (link._id === id.toString()) {
            callback(link.createdAt, user.linksExpiry);
          }
        }
      }
    }
  });
};

// API endpoint for evaluating and shortening a url
app.post("/shorturl", function(req, res) {
  let url = req.body.url;
  let username = req.query.username;
  let sUrl = req.params.sUrl;
  let extractedUrl = extract(url.replace(protocolHandler(url), ""));
  const newUrl = new URL(addUrlPrococol(url));

  if (urlReg.test(url)) {
    dns.lookup(newUrl.hostname, (err, address, family) => {
      if (err) {
        res.send({
          error: "DNS Lookup failed",
          url: newUrl.hostname,
          errmsg: err
        });
      } else {
        urlModel
          .findOne({ originalurl: extractedUrl })
          .then(doc => {
            if (!doc || doc.length === 0) {
              checkShort(shortUrl => {
                let urlProtocol = protocolHandler(url);

                let newUrl = new urlModel({
                  originalurl: extractedUrl,
                  shorturl: shortUrl,
                  urlprotocol: urlProtocol
                })
                  .save()
                  .then(newdoc => {
                    //save link to user model here
                    updateUserLinks(newdoc._id, res, username);
                    res.status(201).json({
                      id: newdoc._id,
                      original_url: newdoc.originalurl,
                      short_url: newdoc.shorturl
                    });
                  })
                  .catch(err => res.json(err));
              });
            } else {
              updateUserLinks(doc._id, res, username);
              return res.json({
                id: doc._id,
                original_url: doc.originalurl,
                short_url: doc.shorturl
                // linkactive: resolveExpired(username, doc._id, (status)=> status)
              });
            }
          })
          .catch(err => res.json(err));
      }
    });
  } else {
    res.send({ error: "invalid URL" });
  }
});

//redirect to original url
app.get("/shorturl/:sUrl", function(req, res) {
  let sUrl = req.params.sUrl;
  //function to return short url from custom -here

  urlModel.find({}).then(urls => {
    getUserInfoFromLink(
      sUrl,
      (date, linkTime) => {
        if (linkActive(getExpiryDays(date, linkTime))) {
          getCustomDoc(sUrl, doc => {
            if (doc) {
              res.status(301).redirect(doc.urlprotocol + doc.originalurl);
            } else {
              if (shortUrlReg.test(sUrl)) {
                urlModel
                  .findOne({ shorturl: sUrl })
                  .then(doc =>
                    res.status(301).redirect(doc.urlprotocol + doc.originalurl)
                  )
                  .catch(err => res.json(err));
              } else {
                res.send({ error: "invalid URL" });
              }
            }
          });
        } else {
          res.send("Link Expired");
        }
        //  console.log(getLinkId(urls, sUrl))
      },
      getLinkId(urls, sUrl)
    );
  });

  //find the user and pass it to the function before executing or find the custom url id without user
});

//Customize links
app.post("/shorturl/custom/:username", (req, res) => {
  let _id = req.query.id;
  let customurl = req.body.customurl;
  let username = req.params.username;
  //console.log(username)
  usersModel.findOne({ userName: username }).then(doc => {
    if (!doc || doc.length === 0) {
      res.status(400).json({ err: "User not found" });
    } else {
      //console.log(doc);
      const customizeLinks = async () => {
        console.log(_id);
        updateCustomLink(res, _id, doc.linksShortened, customurl);
        await doc.save();
        //res.send({msg: "saved"})
      };
      customizeLinks();
    }
  });
});

// app.get('/links', (req, res)=> {
//   urlModel.find({})
//   .then(doc=> {
//     if (doc || doc.length > 0){
//       res.status(201).send(doc)
//     }
//   })
// })

app.listen(port, function() {
  console.log("Node.js listening ...");
});
