const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  AuthenticationError,
  ForbiddenError
} = require('apollo-server-express');
require('dotenv').config();
const gravatar = require('../util/gravatar');
const mongoose = require('mongoose');

module.exports = {
  newNote: async (parent, args, { models, user }) => {
    if (!user) {
      throw new AuthenticationError('You must be signed in to create a note');
    }

    return await models.Note.create({
      content: args.content,
      author: mongoose.Types.ObjectId(user.id)
    });
  },

  deleteNote: async (parent, { id }, { models }) => {
    if (!user) {
      throw new AuthenticationError(' You must be signed in to delete a note');
    }
    const note = await models.Note.findById(id);

    if (note && String(note.author) !== user.id) {
      throw new ForbiddenError('You do not have permissios to delete the note');
    }

    try {
      await note.remove();
      return true;
    } catch (err) {
      return false;
    }
  },

  updateNote: async (parent, { content, id }, { models }) => {
    if (!user) {
      throw new AuthenticationError('You must be signed in to update a note');
    }
    const note = await models.Note.findById(id);
    if (note && String(note.author) !== user.id) {
      throw new ForbiddenError(
        'You do not havev permissions to update the note'
      );
    }

    return await models.Note.findOneAndUpdate(
      {
        _id: id
      },
      {
        $set: {
          content
        }
      },
      {
        new: true
      }
    );
  },

  signUp: async (parent, { username, email, password }, { models }) => {
    email = email.trim().toLowerCase();
    const hashed = await bcrypt.hash(password, 10);
    const avatar = gravatar(email);
    try {
      const user = await models.User.create({
        username,
        email,
        avatar,
        password: hashed
      });
      return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    } catch (err) {
      console.log(err);
      throw new Error('Error creating account');
    }
  },

  signIn: async (parent, { username, email, password }, { models }) => {
    if (email) {
      // normalize email address
      email = email.trim().toLowerCase();
    }
    const user = await models.User.findOne({
      $or: [{ email }, { username }]
    });
    // if no user is found, throw an authentication error
    if (!user) {
      throw new AuthenticationError('Error signing in');
    }
    // if the passwords don't match, throw an authentication error
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AuthenticationError('Error signing in');
    }
    // create and return the json web token
    return jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  },
  toggleFavorite: async (parent, { id }, { models, user }) => {
    // if no user context is passed, throw auth error
    if (!user) {
    throw new AuthenticationError();
    }
    // check to see if the user has already favorited the note
    let noteCheck = await models.Note.findById(id);
    const hasUser = noteCheck.favoritedBy.indexOf(user.id);
    // if the user exists in the list
    // pull them from the list and reduce the favoriteCount by 1
    if (hasUser >= 0) {
    return await models.Note.findByIdAndUpdate(
    id,
    {
    $pull: {
    favoritedBy: mongoose.Types.ObjectId(user.id)
    },
    $inc: {
    favoriteCount: -1
    }
    },
    {
    // Set new to true to return the updated doc
    new: true
    }
    );
    } else {
    // if the user doesn't exist in the list
    // add them to the list and increment the favoriteCount by 1
    return await models.Note.findByIdAndUpdate(
    id,
    {
    $push: {
    favoritedBy: mongoose.Types.ObjectId(user.id)
    },
    $inc: {
    favoriteCount: 1
    }
    },
    {
    new: true
    }
    );
    }
    },
    
  
};
