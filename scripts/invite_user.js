#!/usr/bin/env node

const yargs = require('yargs');

const { database, connectDatabase } = require('../services/database');
const User = require('../models/user');
const { UserRoles } = require('../services/user-roles');

const args = yargs
  .usage('Usage: -n <name>')
  .option(
    'e',
    {
      alias: 'email',
      describe: 'Email to invite',
      type: 'string',
      demandOption: true,
    },
  )
  .option(
    'r',
    {
      alias: 'role',
      describe: 'The role for the user',
      choices: UserRoles,
      default: 'guest',
    },
  )
  .argv;

const inviteUser = async (options) => {
  await connectDatabase();

  const user = {
    'google.email': options.e,
    method: 'google',
    role: options.r,
  };

  await User.create(user)
    .catch((e) => {
      console.error(e.message);
    });

  database.close();
};

inviteUser(args);
console.info('done');
