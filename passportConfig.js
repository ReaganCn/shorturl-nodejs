const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");

function initializePassport(passport) {
  const authenticateUser = async (user, password, done) => {
    if (user === null) {
      console.log({ message: "username not found" });
      return done(null, false, { message: "username not found" });
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, {message:"Password incorrect"})
      }
    } catch(e) {
      return done(e)
    }
  };
  
  passport.use(new LocalStrategy(authenticateUser));
  
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    done(null, id)
    
  });
}

module.exports = initializePassport
