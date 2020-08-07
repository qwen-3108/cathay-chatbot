const { INTENT, SEC_STATUS } = require('../../../@global/CONSTANTS');
const BOOK = INTENT.SERVICE.BOOK;

const validateAndMutateInfo = require('./book/helpers/validateAndMutateInfo');
const slotFilling = require('./book/helpers/slotFilling');
const resetBookingInfo = require('../../../@util/resetBookingInfo');
const confirmEdit = require('../../../_telegram/reply/confirmEdit');
const seat = require('./book/seat');

module.exports = async function bookHandler({ text, intentArr, extractedInfo, sessionToMutate }) {

    console.log('-----bookHandler triggered-----');
    console.log('booking subintent: ', intentArr[2]);

    switch (intentArr[2]) {
        case BOOK.START.SELF:
        case BOOK.WHAT_ABOUT.SELF:
        case BOOK.ANSWER_PROMPT.SELF:
            {
                sessionToMutate.bookingInfo.ticketing = [];
                if (sessionToMutate.secondary === SEC_STATUS.CONFIRM_EDIT) {
                    const { daysToDbDate, nextWeekAreDaysLessThan } = sessionToMutate.bookingInfo.dateTime;
                    sessionToMutate.bookingInfo = resetBookingInfo(daysToDbDate, nextWeekAreDaysLessThan);
                }
                const { ok } = await validateAndMutateInfo({ extractedInfo, sessionToMutate });
                if (ok) {
                    await slotFilling({ text, sessionToMutate });
                }
            }
            break;
        case BOOK.EDIT_INFO.SELF:
            {
                const { ok } = await validateAndMutateInfo({ extractedInfo, sessionToMutate });
                if (ok) {
                    sessionToMutate.status.secondary = SEC_STATUS.CONFIRM_EDIT;
                    sessionToMutate.counter.editInfoCount++;
                    const { chatId, bookingInfo, counter } = sessionToMutate;
                    await confirmEdit(chatId, text, bookingInfo, counter.editInfoCount);
                }
            }
            break;
        case BOOK.SEAT.SELF:
            await seat({ text, intentArr, extractedInfo, sessionToMutate });
            break;
        default:
            throw `Unrecognized book sub intent ${intentArr[2]}`;
    }

}