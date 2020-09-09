const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const usersModel = require("./models/usersModel");

module.exports = function(passport) {
  const authenticateUser = (username, password, done) => {
    usersModel.findOne({ userName: username }, async (err, user) => {
      if (err) throw err;
      if (!user) {
        console.log({ message: "username not found" });
        return done(null, false, { message: "username not found" });
      }

      if (await bcrypt.compare(password, user.password)) {
        return done(null, user);
      } else {
        console.log("Password Incorrect");
        return done(null, false, { message: "Password incorrect" });
      }
    });
  };

  passport.use(new LocalStrategy(authenticateUser));

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser((id, done) => {
    usersModel.findById(id, (error, user) => {
      done(error, user);
    });
  });
};

//module.exports = initializePassport
