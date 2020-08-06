const { differenceInCalendarDays, addDays } = require('date-fns');

const queryDialogflow = require('../_dialogflow/queryDialogflow');
const getShowtimes = require('../_database/query/getShowtimes');
const { COLLECTIONS } = require('../@global/COLLECTIONS');
const { INTENT, NO_RESULT_REASON, DATES_IN_DB } = require('../@global/CONSTANTS');
const assignDateTime = require('../@util/assignDateTime');
const makeInlineQueryResult = require('../@util/makeInlineQueryResult');
const answerInlineQuery = require('../_telegram/post/answerInlineQuery');


module.exports = class InlineQuery {
    constructor(queryId) {
        this.queryId = queryId;

        const today = new Date();
        today.setHours(6,0,0);
        const todayDay = today.getDay();
        const todayDbDate = new Date(DATES_IN_DB[todayDay]);
        const maxDate = addDays(today, 6);
        this.queryFilter = {
            dateTime: { start: today, end: maxDate, daysToDbDate: differenceInCalendarDays(today, todayDbDate), nextWeekAreDaysLessThan: todayDay },
            movie: { title: null, id: null },
            cinema: []
        };
    }

    async handleInlineQuery(query, offset) {
        const currentOffset = offset === "" ? 0 : Number(offset);
        const { intent, extractedInfo } = await queryDialogflow(this.queryId, 'INLINE_QUERY ' + query);

        //assigning to filter
        for (const param in extractedInfo) {
            if (extractedInfo[param] !== "") {
                switch (param) {
                    case "date-time":
                        const { start, end } = assignDateTime(extractedInfo['date-time']);
                        this.queryFilter.dateTime.start = start;
                        this.queryFilter.dateTime.end = end;
                        break;
                    case "movie-status":
                        this.queryFilter.movieStatus = extractedInfo[param];
                        break;
                    case "movie":
                        const movie = await COLLECTIONS.movies.findOne({ title: extractedInfo.movie }, "isBlockBuster debutDateTime");
                        this.queryFilter.movie = {
                            id: movie._id,
                            title: extractedInfo.movie,
                            isBlockBuster: movie.isBlockBuster,
                            debutDateTime: movie.debutDateTime
                        }
                        break;
                    case "cinema":
                        this.queryFilter.cinema = [extractedInfo[param]];
                        break;
                    case "place":
                        const placeCursor = await COLLECTIONS.places.find({ name: extractedInfo.place });
                        const place = await placeCursor.toArray();
                        if (place.length === 0) throw 'Custom error: No such place in database';
                        if (place.length > 1) throw 'More than one place matched in database';
                        let distance = 0;
                        let nearbyCinemas = [];
                        while (nearbyCinemas.length === 0) {
                            distance += 5000;
                            const cinemaCursor = await COLLECTIONS.cinemas.find(
                                {
                                    location: {
                                        $near: {
                                            $geometry: {
                                                type: place[0].geometry.type,
                                                coordinates: place[0].geometry.coordinates.map(str => Number(str))
                                            },
                                            $maxDistance: distance
                                        }
                                    }
                                }, { cinema: 1 });
                            nearbyCinemas = await cinemaCursor.toArray();
                        }
                        this.queryFilter.cinema = nearbyCinemas.map(cinemaObj => cinemaObj.cinema);
                    default:
                        this.queryFilter[param] = extractedInfo[param];

                }
            }
        }


        if (intent === INTENT.INLINE_QUERY_MOVIE) {

            const { dateTime, cinema, place, movieStatus } = this.queryFilter;

            let movies;
            let inlineQueryResult;
            let movieCursor;

            if (movieStatus === 'Now Showing') {
                movieCursor = await COLLECTIONS.movies.find(
                    { debutDateTime: { $lt: new Date() } },
                    { title: 1, poster: 1, genre: 1, language: 1, rating: 1, trailer: 1 }
                );
            } else if (movieStatus === 'Upcoming') {
                movieCursor = await COLLECTIONS.movies.find(
                    { debutDateTime: { $gt: new Date() } },
                    { title: 1, poster: 1, genre: 1, language: 1, rating: 1, trailer: 1 }
                );
            } else {
                const { success, showtimes } = await getShowtimes(this.queryFilter, { projection: { movieId: 1 } });
                if (success) {
                    let filteredMovies = showtimes.map(schedule => schedule.movieId);
                    let filteredMovieSet = new Set(filteredMovies);
                    let filteredMovieArr = Array.from(filteredMovieSet);
                    console.log('filteredMovieArr: ', JSON.stringify(filteredMovieArr));
                    movieCursor = await COLLECTIONS.movies.find({ _id: { $in: filteredMovieArr } });
                } else {
                    //fill inlineQueryResult with some placeholder
                }
            }
            movies = await movieCursor.toArray();
            console.log(movies.map(movie => movie.title));
            inlineQueryResult = makeInlineQueryResult.movie(movies, query);
            await answerInlineQuery(this.queryId, inlineQueryResult);

        } else if (intent === INTENT.INLINE_QUERY_SHOWTIME) {

            if (this.queryFilter.movie.title === null) throw 'Wrong intent matching: Matched query showtime when no movie is provided';

            let inlineQueryResult;

            const { success, showtimes, noResultReason } = await getShowtimes(
                this.queryFilter,
                {
                    projection: { dateTime: 1, totalSeats: 1, sold: 1, isPlatinum: 1, cinema: 1, movieId: 1, },
                    offset: currentOffset
                }
            );

            if (!success && noResultReason === NO_RESULT_REASON.END_PAGINATION) {
                //do nth
            } else if (!success) {
                //inlineQueryResult = some place holder
            } else {
                inlineQueryResult = makeInlineQueryResult.showtime(showtimes, this.queryFilter, query);
            }

            // console.log(JSON.stringify(inlineQueryResult));
            await answerInlineQuery(this.queryId, inlineQueryResult, currentOffset + 10);

        } else if (intent === INTENT.INLINE_QUERY_CACHE) {

            const cacheId = query.match(/\d+/)[0];
            const cachedResult = await COLLECTIONS.inlineQueryResultCache.findOne({ _id: cacheId });
            if (cachedResult === null) throw `${__filename} | No cached result found`;
            await answerInlineQuery(this.queryId, cachedResult.inlineQueryResult);

        } else {
            throw `Unrecognized inline query intent ${intent} in ${__filename}`;
        }
    }
}
