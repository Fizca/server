# server

The server is written on
[ExpressJS](https://expressjs.com/), and should be a REST
API. There won't be views served, but it's possible that
assets, such as manifests, images, etc may still need to
be served.

Responses should be in JSON format whenever possible.

## Packages Used

* Model creation and maintenance: [MongooseJS](https://mongoosejs.com/)

* Auth using Google and JWT

* Image manipulation: [Sharp](https://sharp.pixelplumbing.com/)

* Image Storage in AWS: [AWS-SDK](https://github.com/aws/aws-sdk-js-v3#getting-started)

* Form Multipart Handling: [Multer](https://www.npmjs.com/package/multer)

# Setup

## Node

The project currently runs on Node 12.

Instructions can be found here: https://formulae.brew.sh/formula/node@12

**brew**
```bash
brew install node@12

# Note: After this, you may need to update your PATH. Keep an eye on the output of brew.
# Example Output:
# If you need to have node@12 first in your PATH, run:
#  echo 'export PATH="/usr/local/opt/node@12/bin:$PATH"' >> ~/.zshrc
```

## Yarn

There is no significan difference between Yarn and NPM for package management.
There is a breakdown on how they operate here: https://www.sitepoint.com/yarn-vs-npm/.

The Yarn documentation can be found here https://yarnpkg.com/getting-started

Install Yarn base version 1.22

```bash
npm install -g yarn
```

## Database

We're using MongoDB.

**Mac**

In mac you can just install via homebrew:

```bash
brew update
brew tap mongodb/brew
brew install mongodb-community
```

**Windows**

Follow the documentation: https://www.mongodb.com/download-center/community

#### Database Explorer

To explore it, you can use the **Robot 3T** application:

https://robomongo.org/download

# Extensions

## VS Code Extensions

* [ESLint ](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [npm](https://marketplace.visualstudio.com/items?itemName=eg2.vscode-npm-script)
* [npm Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.npm-intellisense)
* [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

# Running the Project

## Install Dependencies

```bash
# From within the server directory
yarn install
```

## Project Configurations

Create a `local.json` file inside the config folder:

```json
{
    "oauth": {
        "google": {
            "client_id": "<google client id>",
            "client_secret": "<google client secret>",
            "callback_url": "http://localhost:3001/google/callback"
        }
    }
}
```

Credentials can be found in the [Google App](https://console.cloud.google.com/apis/credentials).

## Startup

> Scripts can be found in the `package.json` file

Normal startup

```bash
brew services start mongodb-community # Run with stop to halt mongodb
yarn start
```

With deamon (hot code reload):

```bash
yarn startd
````

Application then runs on http://localhost:3001 by default.
The port can be changed overriding the `local.json` file,
however, any client will also need to be updated.

To test that things are running correctly, navigate to your [local oath link](localhost:3001/google/oauth) and after you select an account, you should see a log in your yarn console that your account was created.

# Container image

The service ships to Lambda as a container image. The image honors a single
contract: it runs the Express app as an HTTP server on port 8080, with the
[Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter) baked
in as an extension. The adapter is dormant when run outside Lambda, so the same
image works locally and in production. Because the contract is the image, not
the language, a future rewrite (for example Go) is a drop-in swap: build a new
image that serves HTTP on 8080 and the Lambda infra stays the same.

The image targets `linux/amd64` to match the x86_64 Lambda runtime. On Apple
Silicon the build runs under emulation, which is slower but produces the correct
binary. Dependencies install from the committed `yarn.lock`.

## Local stack

`docker-compose.yml` runs the image alongside a Mongo container.

```bash
docker compose up --build
```

Verify the stack is healthy:

```bash
curl http://localhost:8080/api/health
# {"status":"ok","db":"connected"}
```

Note: the session cookie is configured `secure: true` and `sameSite: none`,
which browsers only honor over HTTPS. Health checks and header-based calls work
over plain HTTP locally, but browser cookie login will not set a cookie on
`http://localhost`.

## Deploying

Pushing the image to ECR and switching the Lambda to image-based packaging is
tracked as a separate change. It is not wired here.
