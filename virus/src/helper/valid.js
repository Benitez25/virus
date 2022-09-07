const request = require('request');
const API_KEY = "";

async function curl(options) {
    return new Promise((resolve, reject) => {
        request(options, (err, res, body) => {
            if(err)
                return reject(err);
            resolve(body);
        });
    });
}

async function sleep(sec) {
    return new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve();
        }, sec * 1000);
    });
}

async function resolve_captcha(captcha_file_path) {
    let unparsed_captcha_id = await curl({
        method : 'POST',
        url: `https://2captcha.com/in.php`,
        form: {
            key: API_KEY,
            method: 'base64',
            body: captcha_file_path,
            json: true,
            regsense:1,
            numeric:4
        }
    });
    let parsed_captcha_id = JSON.parse(unparsed_captcha_id);
    let captcha_id = parsed_captcha_id.request;

    while(1) {        
        await sleep(5);
        let captcha_ready = await curl({
            method: 'GET',
            url: `https://2captcha.com/res.php?key=${API_KEY}&action=get&id=${captcha_id}&json=true`
        });
        
        let parsed_captcha_ready = JSON.parse(captcha_ready);
        if(parsed_captcha_ready.status == 1)
        return parsed_captcha_ready.request;
        else if(parsed_captcha_ready.request != "CAPCHA_NOT_READY")
        return false;
    }

}

const validarCaptcha = {
    run : async (imagen_64) => {
        let captcha_text = await resolve_captcha(imagen_64);
        return captcha_text
    }
}

module.exports = validarCaptcha