const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const logger = require('morgan');
const ftp = require("basic-ftp")
const fs = require('fs');
const replace = require('replace-in-file');
const dotenv = require('dotenv');

const result = dotenv.config();
console.log(result);

const fileList = {};
const basePath = '/public_html/gameAssets/Assets';
const urlPath = 'http://nbstudio.com.br/gameAssets/Assets';
const client = new ftp.Client()

const baseHtml = `
<!doctype html>
<html lang="en">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/css/bootstrap.min.css"
      integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
    <style>
      body {margin-top: 20px;}
      h2 {text-align: center;}
      .table-size { max-height: 500px; overflow-y: scroll; margin-bottom: 20px; }
    </style>
    <title>FTP File Downloader</title>
  </head>

  <body>
    <div class="container">
      <!--REPLACE-->
    </div>
    <!-- Optional JavaScript -->
    <script src="https://unpkg.com/feather-icons"></script>
    <!-- jQuery first, then Popper.js, then Bootstrap JS -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"
      integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj"
      crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js"
      integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo"
      crossorigin="anonymous"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/js/bootstrap.min.js"
      integrity="sha384-OgVRvuATP1z7JjHLkuOU7Xw704+h835Lr+6QL9UvYjZE3Ipu6Tp75j7Bh/kR0JKI"
      crossorigin="anonymous"></script>
    <script>
      feather.replace()
    </script>
  </body>
</html>`

const tableHeader = `
<h2><!--REPLACE--></h2>
<div class="table-size">
  <table class="table table-striped table-dark">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Folder</th>
          <th scope="col">Size</th>
          <th scope="col">Type</th>
          <th scope="col">Download</th>
        </tr>
      </thead>
      <tbody>`;
const tableFooter = `
      </tbody>
    </table>
  </div>`;

async function setupHtmlFile() {
  fs.unlink('html/index.html', function (err) {
    if (err) throw err;
  });

  fs.writeFile('html/index.html', baseHtml, function (err) {
    if (err) throw err;
  });
}

async function setupFileList() {
  client.ftp.verbose = true
  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false
    })
    await this.getFileList(basePath);

    let htmlBody = ""
    Object.entries(fileList).forEach(([key, value]) => {
      const title = key === '' ? 'ROOT' : key.toUpperCase()
      htmlBody += tableHeader.replace('<!--REPLACE-->', title);
      value.forEach(file => {
        const splitName = file.name.split('.');
        htmlBody += `
      <tr>
          <td>${file.name}</td>
          <td>${key}</td>
          <td>${formatBytes(file.size)}</td>
          <td>${splitName[splitName.length - 1]}</td>
          <td><a href=" ${urlPath}/${key}/${file.name}" download> <i data-feather="download"></i> </a></td>
        </tr>
      `
      });
      htmlBody += tableFooter;
    });

    const options = {
      files: 'html/index.html',
      from: /<!--REPLACE-->/g,
      to: `${htmlBody}`,
    };

    await replace(options)
  }
  catch (err) {
    console.log(err)
  }
  client.close()
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

getFileList = async (path, relativeFolder = '') => {
  await client.cd(path);
  const initialFolder = await client.list();
  for (let index = 0; index < initialFolder.length; index++) {
    const file = initialFolder[index];
    if (file.type === 1) {
      fileList[relativeFolder] = fileList[relativeFolder] ? [...fileList[relativeFolder], file] : [file];
    }
    else {
      await getFileList(`${path}/${file.name}`, file.name)
    }
  }
}

app.use(logger('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(express.static('public'));
app.use('/', express.static('html'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server is up and running on port ', port);
})


setupHtmlFile();
setupFileList();