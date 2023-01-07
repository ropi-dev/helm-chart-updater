const index = require("./index")
const jwt = require("jsonwebtoken")
const fs = require("fs")

test('a JWT token is generated', () => {
    const privkey = fs.readFileSync("./privkey.pem")
    const pubkey = fs.readFileSync("./pubkey.pem")
    const result = index.generateJwt("279058", privkey);
    console.log(result)
    expect(result).toMatch(/^ey.*/);
    expect(jwt.verify(result, pubkey, {algorithm: "RS256"})).toBeTruthy()
});
