var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bcrypt = require("bcrypt");
var SALT_WORK_FACTOR = 10;

let usersSchema = new mongoose.Schema({
  firstName: String,
  //lastName: String,
  userName: {type: String, required: true},
  // email: String,
  createdAt: {type: Date, default: Date.now()},
  password: {type: String, required: true},
  linksExpiry: {type: Number, default: 29},
  linksShortened: [{_id: String, hits: {type: Number, default: 0}, createdAt: {type: Date, default: Date.now()}, custom: String}]
});
usersSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

usersSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};


let usersModel = mongoose.model("USER", usersSchema);



module.exports = usersModel