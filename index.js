const jwt = require('jsonwebtoken')

const generateJwt = (appId, secret) => {
    const data = {
        'iat': Date.now(),
        'exp': Date.now() + 60,
        'iss': appId
    };
    return jwt.sign(data, secret, { algorithm: 'RS256' })
}

exports.main = (req, res) => {

}

exports.generateJwt = generateJwt
