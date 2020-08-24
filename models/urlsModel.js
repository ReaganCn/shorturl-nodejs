var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");

let urlSchema = new mongoose.Schema({
  originalurl: String,
  shorturl: {type: String, unique: true},
  urlprotocol: String,
  createdAt: {type: Date, default: Date.now()},
});

let urlModel = mongoose.model("URL", urlSchema);

module.exports = urlModel