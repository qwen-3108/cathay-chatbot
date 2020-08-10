const testCase = require('./testCase');

//files under test
const mapDateTime = require('../../mapDateTime');
const decideMaxDate = require('../../decideMaxDate');
const decideMaxDatePhrase = require('../../decideMaxDatePhrase');
const makeDbQuery = require('../../makeDbQuery');
const makeDateTimePhrase = require('../../makeDateTimePhrase');

describe('dateHandling', () => {

    describe('.decideMaxDate & .decideMaxDatePhrase', () => {
        test.each(testCase.decideMaxDate)('%s', (description, startedAt, expectedMaxDate, expectedMaxDatePhrase) => {
            //execute
            const maxDate = decideMaxDate(startedAt);
            const maxDatePhrase = decideMaxDatePhrase(maxDate);
            //assert
            expect(maxDate).toEqual(expectedMaxDate);
            expect(maxDatePhrase).toEqual(expectedMaxDatePhrase);
        });
    });

    describe('.makeDbQuery', () => {
        test.each(testCase.makeDbQuery)('%s', (description) => {
            //execute

            //assert
        });
    });

    describe('.mapDateTime', () => {
        test.each(testCase.mapDateTime)('%s', (description, sessionStartedAt, dateToMap, expectedMappedDate) => {
            //execute
            const mappedDate = mapDateTime(dateToMap, sessionStartedAt);
            //assert
            expect(mappedDate).toEqual(expectedMappedDate);
        });
    });

    describe('.makeDateTimePhrase', () => {

    });


});