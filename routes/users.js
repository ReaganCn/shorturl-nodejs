const express = require("express");

const router = express.Router();

const usersModel = require("../models/usersModel");
const urlModel = require("../models/urlsModel");

//Helper functions
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

const resolveUrls = (userUrlArray, res) => {
  urlModel.find({})
  .then(doc => {
    let matching = [];
    for (let userUrl of userUrlArray){
      for(let url of doc){
        if(url._id.toString() === userUrl._id ){
            let newurl = {...url}
            newurl._doc.custom = userUrl.custom;
            matching.unshift(newurl._doc); 
        }
      }
    }
    res.status(200).send(matching)
  })
  
  .catch(err => res.status(500).json(err));
}


//let items =[{"hits":0,"createdAt":"2020-08-18T08:23:44.720Z","_id":"5f3b90441437160a0b0a522b"},{"hits":0,"createdAt":"2020-08-18T08:25:37.691Z","_id":"5f3b90aa80a5ad0ae4b8bf75"},{"hits":0,"createdAt":"2020-08-18T08:57:11.435Z","_id":"5f3b99f7c382730ba261e504"},{"hits":0,"createdAt":"2020-08-18T09:10:56.093Z","_id":"5f3b99f7c382730ba261e504"},{"hits":0,"createdAt":"2020-08-18T09:37:36.473Z","_id":"5f3ba09010e5341b5578e9f1"},{"hits":0,"createdAt":"2020-08-18T09:37:36.473Z","_id":"5f3ba09010e5341b5578e9f1"},{"hits":0,"createdAt":"2020-08-18T09:39:05.782Z","_id":"5f3ba09010e5341b5578e9f1"}]

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
    .findOne({userName : username})
    .then(doc => {
      if (!doc || doc.length === 0) {
        res.status(500).json({ err: "Cannot find user" });
      } else {
        resolveUrls(doc.linksShortened, res)
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
      user.firstName = req.body.firstname;
      user.password = req.body.password;
      await user.save();
      const updatedUser = await usersModel.find({
        userName: req.body.username
      });
      res
        .status(201)
        .json({ user: updatedUser, msg: "User Updated Successfully" });
    } else {
      res.status(500).json({ err: "Internal Server Error" });
    }
  };
  updateUser();
});

router.post("/authenticate", (req, res) => {
  usersModel.findOne({ userName: req.body.username }, (err, user) => {
    //if (err) throw err;
    if (user) {
      // test a matching password
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (err) throw err;
        res.json(isMatch);
      });
    } else {
      res.json({ err: "User not found. Sign Up instead?" });
    }
  });
});

module.exports = router;
