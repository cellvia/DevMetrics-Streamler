# streamler is your streaming friend

a modular way to manage collections of streams of data and their pipelines

# how does it work

everything encapsulated by the main Streamler object, which you use to create channels, channels contain pipelines which are connections of pipes (data modulators) These pipelines can be hooked and unhooked to each other with ease, and the beauty of the whole thing is that its all streaming.  Large swaths of data arent stored in memory (ahem, xml files).  As well, since the streaming interface is standardized, this makes it trivial to swap a stream destination from say, your app,  to the stdOut,  or to the filesystem.   Managing this level of flexibility and the particular interface of streaming (in conjunction with legacy libraries that are not so well adapted for the purpose) is not the easiest task, hence this rough framework.

# what is it made out of?

## channels

these are like valves that turn on and off to allow streams to pass through

 * main entry / pivot points of the data process flow
 * they are extended eventemitters
 * they convenience wrap scope in order to access shallow vars from within the deep nest
 * receives either manually emitted events or piped in streams of data
 * contains a pipeline, which is a chained sequence of SOURCES, FILTERS, and PUMPERS usually starting with a source, modified by filters, then pumped (to various locations)
 * when an event is emitted this immediately adds to a global "jobs" queue
 * relay / done event is put at the end of the chain to track when jobs are completed, and in the case of relay turn the "valve" ON of another channel, when the stream is finished

## router (not yet done)
 * a map routing the channels to each other. (currently, instructions on where to pass the data reside within the pipeline, via pump:send / relay)

## source streams

access apis, database, filesystem

 * live xml / json parsing
 * request retrying in case of failed request
 * concurrency limiting of requests in queue
 * dump raw input to filestream
 * automatic swapping of api calls with input from dumped file (for slow apis, testing, development, etc)
 * automatically handles behind the scenes piping between parser, filedump, http request
 * push - allows you to push through a manually received data object/objects as if it were a stream

## filter pipes
these are the building blocks for modulating the data stream

 *  think of them as like a sequential queue of functions
 *  a simple built in example is "incrCounter", which simply increments the root.count property every time data passes through it

## pumpers

these are *parallel* methods that are intended to pump the data to another channel, the filesystem, etc

 * log - write data to console, simple
 * dump - write output to disk as json. has automatic stream caching and cleanup, so you dont overlap streams and overwrite the same file
 * send - pass data on to another channel or eventemitter
 * write - stream your data to your database adapter

all of these can access and alter properties of a root object above their context (for use by future incoming streams of data like aggregation over many streams) provided you pass {root: root} as an options argument

all of the above have different options they can receive (for example, many have an "onEnd" option, if set to true will only operate on the data when the stream ends, which is useful to act only on finally aggregated data)

#the final goal

##metrics package

the aim will be to have a metrics package that contains its necessary streams, filters, pumps, and map that can easily be turned on or off, duplicated, modified, etc

# to be done:

 * stream into / from redis
 * convert subscriptions.js to use streams
