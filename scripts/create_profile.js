#!/usr/bin/env node

const yargs = require('yargs');

const { database, connectDatabase } = require('../services/database');
const Profile = require('../models/profile');

const args = yargs
  .usage('Usage: -n <name>')
  .option(
    'n',
    {
      alias: 'name',
      describe: 'Nameof the profile',
      type: 'string',
      demandOption: true,
    },
  )
  .option(
    'b',
    {
      alias: 'birthday',
      describe: 'The role for the user',
      type: 'string',
    },
  )
  .option(
    'a',
    {
      alias: 'nickname',
      describe: 'The nickname or alias',
      type: 'string',
    },
  )
  .argv;

const createProfile = async (options) => {
  await connectDatabase();

  const profile = {
    name: options.n,
    birthday: new Date(options.b),
    nickname: options.a,
  };

  console.log(profile);
  await Profile.create(profile)
    .catch((e) => {
      console.error(e.message);
    });

  database.close();
};

createProfile(args);
console.info('done');
