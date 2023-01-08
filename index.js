import jwt from 'jsonwebtoken'
import storage from '@google-cloud/storage'
import functions from '@google-cloud/functions-framework'
import fetch from 'node-fetch'
import fs from "fs";

const generateJwt = (appId, secret) => {
    const data = {
        'iat': Math.round(Date.now() / 1000),
        'exp': Math.round(Date.now() / 1000) + 60,
        'iss': appId
    };
    return jwt.sign(data, secret, {algorithm: 'RS256'})
}

const getInstallationAccessToken = async (jwt, installation) => {
    return fetch(`https://api.github.com/app/installations/${installation}/access_tokens`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${jwt}`,
            "Accept": "application/vnd.github+json"
        }
    }).then(response => response.json())
        .then(response => response["token"])
}

const getInstallationId = async (jwt, accountId) => {
    return fetch("https://api.github.com/app/installations", {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${jwt}`,
            "Accept": "application/vnd.github+json"
        }
    }).then(response => {
        if (response.ok) {
            return response.json();
        }
        return Promise.reject({
            status: response.status,
            statusText: response.statusText,
        })
    })
        .then(response => response.find(item => String(item["account"]["id"]) === accountId))
        .then(response => response.id)
}

const getLatestReleaseAssetsUrl = async (token, repo) => {
    return fetch(`https://api.github.com/repos/ropi-dev/${repo}/releases`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json"
        }
    })
        .then(response => response.json())
        .then(response => response[0])
        .then(response => response['assets_url'])
}

const getLatestReleasePackageDownloadUrl = async (token, url) => {
    return fetch(url, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json"
        }
    })
        .then(response => response.json())
        .then(response => response.find(item => item["name"].endsWith(".tgz")))
        .then(response => ({
            url: response["url"],
            name: response["name"]
        }))
}

const handler = async (req, res) => {
    const jwt = generateJwt(process.env.APPID, process.env.PRIVKEY)

    await getInstallationId(jwt, process.env.ACCID)
        .then(async (id) => await getInstallationAccessToken(jwt, id))
        .then(async (token) => ({token, url: await getLatestReleaseAssetsUrl(token, "tsc-base-service-chart")}))
        .then(async (result) => ({...result, ...await getLatestReleasePackageDownloadUrl(result.token, result.url)}))
        .then(async (result) => await downloadChart(result))
        .then(file => res.status(200).send(file))
        .catch(error => res.status(500).send(error))
};
functions.http('main', handler);

async function downloadIndex(from, filename) {
    const client = new storage.Storage();

    return client
        .bucket(from)
        .file(filename)
        .copy(filename)
        .finally(res => {
            console.log("------------------ FILE ------------------")
            console.log(res)
        });
}

const downloadChart = async (download) => {
    try {
        const res = await fetch(download.url, {
            headers: {
                "Authorization": `Bearer ${download.token}`,
                "Accept": "application/octet-stream"
            },
            follow: 10
        });
        const fileStream = fs.createWriteStream(download.name);
        return new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on("error", reject);
            fileStream.on("finish", resolve);
        }).then(() => download.name);
    } catch (e) {
        return Promise.reject(e)
    }

}

export {
    generateJwt,
    handler
}
