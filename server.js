var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
    console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
    process.exit(1);
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true);
    var pathWithQuery = request.url;
    var queryString = "";
    if (pathWithQuery.indexOf("?") >= 0) {
        queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
    }
    var path = parsedUrl.pathname;
    var query = parsedUrl.query;
    var method = request.method;

    /******** 从这里开始看，上面不要看 ************/
    const session = JSON.parse(fs.readFileSync('./db/session.json').toString());
    console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);
    if (path === '/sign_in' && method === 'POST') {
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'));
        let array = [];
        request.on('data', chunk => {
            array.push(chunk);
        });
        request.on('end', () => {
            const obj = JSON.parse(array.toString());
            const user = userArray.find(user => user.name === obj.name && user.password === obj.password);
            if (user === undefined) {
                response.setHeader('content-type', 'text/json;charset=utf-8');
                response.statusCode = 400;
                response.end(`{"errorCode":4001}`)
            } else {
                response.statusCode = 200;
                const random = Math.random();
                session[random] = {
                    "user_id": user.id
                };
                fs.writeFileSync('./db/session.json', JSON.stringify(session));
                response.setHeader('Set-Cookie', `session_id=${random};HttpOnly;`);
                response.end('登陆成功')
            }
        });
    } else if (path === '/home.html') {
        response.setHeader('content-type', 'text/html;charset=utf-8');
        let session_id;
        try {
            session_id = request.headers['cookie'].split(';').filter(item => item.indexOf('session_id') >= 0)[0].split('=')[1];
        } catch (error) {};
        let user_id;
        if (session_id && session[session_id]) {
            user_id = session[session_id].user_id;
        }
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'));
        const user = userArray.find(item => item.id === user_id);
        const homeHtml = fs.readFileSync('./public/home.html').toString();
        if (user) {
            response.write(homeHtml.replace('{{user.name}}', user.name).replace('{{status}}', '已登录'))
        } else {
            response.write(homeHtml.replace('{{user.name}}', '').replace("{{status}}", '未登录'))
        }
        response.end()
    } else if (path === '/register' && method === 'POST') {
        response.setHeader('content-type', 'text/html;charset=utf-8');
        const userArray = JSON.parse(fs.readFileSync('./db/users.json'));
        let array = [];
        request.on('data', chunk => {
            array.push(chunk);
        });
        request.on('end', () => {
            const obj = JSON.parse(array.toString());
            obj.id = userArray.length > 0 ? userArray[userArray.length - 1].id + 1 : 1;
            const newUser = {
                id: obj.id,
                name: obj.name,
                password: obj.password
            }
            userArray.push(newUser);
            fs.writeFileSync('./db/users.json', JSON.stringify(userArray));
        });
        response.end()
    } else {
        response.statusCode = 200;
        let filePath = path === '/' ? '/index.html' : path;
        const suffix = filePath.substring(filePath.lastIndexOf('.'));
        const fileTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        }
        response.setHeader("Content-Type", `${fileTypes[suffix]};charset=utf-8`);
        let content;
        // 如果不try catch的话，那么当访问一个不存在的文件时，页面会报错，刷新不出来
        try {
            content = fs.readFileSync(`./public${filePath}`)
        } catch (error) {
            content = '文件不存在';
            response.statusCode = 404;
        }
        response.write(content);
        response.end();
    }

    /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
    "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);