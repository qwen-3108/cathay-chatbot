const { format, addDays, isBefore, differenceInHours } = require('date-fns');

const { INLINE_KEYBOARD, CINEMA_THUMB, NA_THUMB } = require('../@global/CONSTANTS');
const calculatePrice = require('./calculatePrice');
const mapDateTime = require('../@util/mapDateTime');
const decideMaxDatePhrase = require('../@util/decideMaxDatePhrase');

module.exports = { movie, cinema, showtime, resultExpired, showtimeNotUp, noResult };

function movie(movieArr, queryIdentifier) { //queryIdentifier can be query text or unique result ❤️ cacheId string

    const inlineQueryResult = movieArr.map(movie => {
        // director, cast,synopsis, runtime,
        const { _id, title, poster, genre, language, rating, trailer } = movie;

        const genreStr = genre.join(', ');
        const formatGenreStr = genreStr[0] + genreStr.slice(1).toLowerCase();
        const ratingStr = rating === 'TBA' ? 'Rating to be announced' : rating;
        const trailerStr = trailer !== null && trailer !== undefined ? `[Trailer ↗](${trailer})` : '';

        const input_message_content = {
            message_text: `*${title}* ${trailerStr}\nLanguage: ${language}\nGenre: ${formatGenreStr}\nRating: ${rating}`,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        }

        const reply_markup = {
            inline_keyboard: [[
                { text: 'Back to List', switch_inline_query_current_chat: queryIdentifier },
                { text: 'More Info', callback_data: `movieId =${_id} show=` },
                { text: 'Showtime', callback_data: `movieId =${_id} showtime=` }]]
        }

        return ({
            type: 'article',
            id: 'movieId:' + _id,
            thumb_url: poster,
            title,
            description: `${language} · ${formatGenreStr} · ${ratingStr}`,
            input_message_content,
            reply_markup
        });
    });

    return inlineQueryResult;

}

function cinema(cinemaArr) {
    console.log('Update: Making inline query result for cinemas...');
    const inlineQueryResult = cinemaArr.map(cinema => {

        const { _id, cinema: cinemaName, address, mrt, withPlatinumMovieSuites } = cinema;

        const facilityStr = withPlatinumMovieSuites ? ' | With Platinum Movie Suites' : '';
        const input_message_content = {
            message_text: `💬 ${cinemaName}`,
            disable_web_page_preview: true
        }

        return ({
            type: 'article',
            id: _id.toString(),
            title: cinemaName,
            description: `Nearest MRT: ${mrt}${facilityStr}`,
            thumb_url: CINEMA_THUMB[cinemaName],
            input_message_content
        });
    });

    return inlineQueryResult;

}

function showtime(showtimeArr, bookingInfo, queryIdentifier) {

    const inlineQueryResult = [];
    // add mappedDate property to each showtime for sorting
    showtimeArr.forEach(function (showtime) {
        showtime.mappedDate = mapDateTime(showtime.dateTime, bookingInfo.dateTime.sessionStartedAt);
    });
    showtimeArr.sort(function (a, b) {
        const bBeforeA = isBefore(b.mappedDate, a.mappedDate);
        if (bBeforeA) {
            return 1;
        } else if (differenceInHours(a, b) === 0) {
            return 0;
        } else {
            return -1;
        }
    });

    for (let i = 0; i < showtimeArr.length; i++) {
        const showtime = showtimeArr[i];

        const { _id, cinema, mappedDate, isPlatinum, totalSeats, sold } = showtime;

        const ticketLeft = totalSeats - sold;
        const ticketStr = ticketLeft === 1 ? '1 seat left' : `${ticketLeft} seats left`;
        const experienceStr = isPlatinum ? '[Platinum Movie Suites](https://www.cathaycineplexes.com.sg/new-experiences/)' : '';
        const selected = { movie: bookingInfo.movie, ...showtime };
        const ticketPrice = calculatePrice(selected);

        const input_message_content = {
            message_text: `*${bookingInfo.movie.title}*\n${format(mappedDate, 'd MMMM yyyy (E)')}, ${format(mappedDate, 'h aa')}\n${cinema}${experienceStr ? '\n' + experienceStr : ''}\n🔖 Ticket price: S$ ${ticketPrice.toFixed(2)}`,
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        }
        console.log(`scheduleId =${_id}=`);
        const reply_markup = {
            inline_keyboard: [[
                { text: 'Back to List', switch_inline_query_current_chat: queryIdentifier },
                { text: 'Seating Plan', callback_data: `sId =${_id}=` }]]
        };

        inlineQueryResult.push({
            type: 'article',
            id: 'scheduleId:' + _id.toString(),
            title: `${format(mappedDate, 'd MMMM yyyy (E)')} · ${format(mappedDate, 'h aa')}`,
            description: `${cinema} ${experienceStr ? '· Platinum Movie Suites' : ''}· ${ticketStr}`,
            thumb_url: CINEMA_THUMB[cinema],
            input_message_content,
            reply_markup
        });
    }

    return inlineQueryResult;

}

function resultExpired() {

    const inlineQueryResult = [];

    const input_message_content = {
        message_text: "Search expired 🥀"
    };

    inlineQueryResult.push({
        type: 'article',
        id: 'result expired',
        title: 'Oops! Search Expired',
        description: 'Tell me your preferred movie or date/location again! :)',
        thumb_url: NA_THUMB,
        input_message_content,
    });


    return inlineQueryResult;
}

function showtimeNotUp(maxDate) {

    const inlineQueryResult = [];

    const input_message_content = {
        message_text: 'Schedules not up 🦥'
    };

    inlineQueryResult.push({
        type: 'article',
        id: 'showtime not available',
        title: 'Oops! Schedules Not Available ',
        description: `Showtimes are updated until ${decideMaxDatePhrase(maxDate)} :)`,
        thumb_url: NA_THUMB,
        input_message_content,
    });


    return inlineQueryResult;

}

function noResult({ type }) { //type = 'movie' or 'showtime'

    const inlineQueryResult = {
        type: 'article',
        id: 'no result',
        thumb_url: NA_THUMB
    };

    switch (type) {
        case 'movie':
            inlineQueryResult.input_message_content = { message_text: 'No movies found 🍃' };
            inlineQueryResult.title = 'Oops! No Movies Found';
            inlineQueryResult.description = 'Try another day / place?';
            inlineQueryResult.reply_markup = { inline_keyboard: [[INLINE_KEYBOARD.MOVIE]] };
            break;
        case 'showtime':
            inlineQueryResult.input_message_content = { message_text: 'No showtimes found 🍃' };
            inlineQueryResult.title = 'Oops! No Showtimes Found';
            inlineQueryResult.description = 'Try another movie / day / place?';
            break;
        default:
            throw `Unrecognized type ${type} passed to makeInlineQueryResult.noResult`;
    }

    return [inlineQueryResult];

}