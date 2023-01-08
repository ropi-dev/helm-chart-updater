import * as index from "./index.js"
import jwt from "jsonwebtoken"
import fs from "fs"

test.only('a JWT token is generated', () => {
    const privkey = fs.readFileSync("./privkey.pem")
    const pubkey = fs.readFileSync("./pubkey.pem")
    const result = index.generateJwt("279058", privkey);
    console.log(result)
    expect(result).toMatch(/^ey.*/);
    expect(jwt.verify(result, pubkey, {algorithm: "RS256"})).toBeTruthy()
});

test('call github api', async () => {
    process.env.APPID = "279058"
    process.env.ACCID = "117531988"
    if(!process.env.PRIVKEY) {
        process.env.PRIVKEY = fs.readFileSync("./privkey.pem")
    }

    await index.handler({}, {
        status: () => ({
            send: (s) => console.log(s)
        })
    })
})
