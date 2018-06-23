'use strict';

exports.helloworld = (request, response) => {
  response.status(200).send('Hello World!');
};
