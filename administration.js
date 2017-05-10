//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////// PASSWORD AND ADMIN RIGHT FILES //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

var hash = require('password-hash')

var jwt = require('jsonwebtoken')
var secret = "dominaRocks"
//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// GET ALL MOVIES ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////


exports.isAdmin = function(role) {
    if (role != "admin")
        return false
    else
        return true        
}

exports.hashPassword = function(password) {
    var pass = hash.generate(password)
    return (pass)
}

exports.verifyPassword = function(inputPassword, pass) {
    return (hash.verify(inputPassword, pass))
}

exports.createAPIToken = function(username, password, userId, callback) {
    var payload = {userId: userId, username: username}
    
    jwt.sign(payload, secret, {}, function(err, token) {
        callback(token)
    })
}

exports.checkToken = function(token, callback) {
    jwt.verify(token, secret, function(err, token){
      callback(err)  
    })
}