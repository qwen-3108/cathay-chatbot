const { INLINE_KEYBOARD } = require('../../@global/CONSTANTS');
const post = require('../post');

module.exports = { faqNowShowing };

async function faqNowShowing(chat_id) {

    const text = 'Here’s a list of all movies showing at our cinemas 😁 Tap the button to view 👇🏻';
    const replyMarkup = { inline_keyboard: [[INLINE_KEYBOARD.MOVIE]] };
    await post.sendMessage(chat_id, text, { replyMarkup });

}
