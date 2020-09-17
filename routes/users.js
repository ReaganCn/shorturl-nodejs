const express = require("express");
const passport = require("passport");

const router = express.Router();

const usersModel = require("../models/usersModel");
const urlModel = require("../models/urlsModel");

//---------------------MIDDLEWARES--------------------------------

//require("../passportConfig");

//--------------------Helper functions----------------------------

const checkUserName = (username, callback) => {
  usersModel.find({ userName: username }).then(doc => {
    if (!doc || doc.length === 0) {
      callback(true);
    } else {
      callback(false);
    }
  });
};

//resolve url ids

const resolveUrls = (userUrlArray, res, expiryDays) => {
  urlModel
    .find({})
    .then(doc => {
      let matching = [];
      for (let userUrl of userUrlArray) {
        for (let url of doc) {
          if (url._id.toString() === userUrl._id) {
            let newurl = { ...url };
            newurl._doc.custom = userUrl.custom;
            newurl._doc.dateCreated = userUrl.createdAt;
            newurl._doc.expiresIn = getExpiryDays(
              userUrl.createdAt,
              expiryDays
            );
            matching.unshift(newurl._doc);
          }
        }
      }
      res.status(200).send(matching);
    })

    .catch(err => res.status(500).json(err));
};

const getExpiryDays = (created, expiryDays) => {
  let createdDate = new Date(created);
  let newDate = Date.now();
  const difference = newDate - createdDate.getTime();
  const daysRemaining = expiryDays - difference / 86400000;
  return daysRemaining;
};

//-------------------------API ENDPOINTS --------------------------

router.get("/", (req, res) => {
  usersModel
    .find({})
    .then(doc => {
      if (!doc || doc.length === 0) {
        res.status(500).json({ err: "failed to get users" });
      } else {
        res.status(200).send(doc);
      }
    })
    .catch(err => res.status(500).json(err));
});

router.get("/links", (req, res) => {
  let username = req.query.username;
  usersModel
    .findOne({ userName: username })
    .then(doc => {
      if (!doc || doc.length === 0) {
        res.status(500).json({ err: "Cannot find user" });
      } else {
        resolveUrls(doc.linksShortened, res, doc.linksExpiry);
      }
    })
    .catch(err => res.status(500).json(err));
});

router.post("/add", (req, res) => {
  checkUserName(req.body.username, available => {
    if (available) {
      let newUser = new usersModel({
        firstName: req.body.firstname,
        userName: req.body.username,
        password: req.body.password
      })
        .save()
        .then(doc => res.json({ user: doc, msg: "Account Created" }))
        .catch(err => res.json(err));
    } else {
      res.json({ err: "Username already taken. Sign in instead?" });
    }
  });
});

router.post("/update", (req, res) => {
  const updateUser = async () => {
    let user = await usersModel.findOne({ userName: req.body.username });
    if (user) {
      if(req.body.password && req.body.firstname){
      user.firstName = req.body.firstname;
      user.password = req.body.password;
      }else if(req.body.firstname){
        user.firstName = req.body.firstname;
      } else if(req.body.password ){
        user.password = req.body.password;
      }
      await user.save();
      res 
        .status(201)
        .json({ user: await user, msg: "User Updated Successfully" });
    } else {
      res.status(500).json({ err: "User not found" });
    }
  };
  updateUser();
});

router.post("/authenticate", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) throw err;
    if (!user) {
      res.send({ authenticated: false });
    } else {
      req.logIn(user, err => {
        if (err) throw err;
        res.send(req.user);
      });
    }
  })(req, res, next);
});

router.get("/user", (req, res) => {
  res.status(200).send(req.user || {authentication : "Failed"});
  //console.log(req.user)
});

router.get("/user/logout", async (req, res)=> {
  await req.logOut();
  res.send({logout: true});
})

module.exports = {
  usersRoute: router,
  getExpiryDays: getExpiryDays
};
