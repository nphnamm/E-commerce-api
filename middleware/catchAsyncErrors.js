/* 
This code defines a function that acts as a middleware wrapper for asynchronous functions in an
Express.js application. It ensures that any errors thrown or rejected promises within the wrapped 
function are properly handled and passed to the next error-handling middleware. 

*/

module.exports = (theFunc) => (req, res, next) => {
  // console.log(req);
  Promise.resolve(theFunc(req, res, next)).catch(next);
};
