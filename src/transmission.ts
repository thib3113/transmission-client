import axios, {AxiosInstance} from "axios";
import fs from "fs";
import {Buffer} from "safe-buffer";
import uuid from "uuid/v4";
import unique from "array-unique";

export interface TransmissionConfig {
    host?: string
    port?: number
    username?: string
    password?: string
    ssl?: boolean
    path?: string
}

export enum TransmissionStatus {
    'STOPPED' = 1,
    'CHECK_WAIT' = 2,
    'CHECK' = 3,
    'DOWNLOAD_WAIT' = 4,
    'DOWNLOAD' = 5,
    'SEED_WAIT' = 6,
    'SEED' = 7,
    'ISOLATED' = 8
}

export interface Query {

}

export interface ITrackerStat {
    announce: string,
    announceState: number,
    downloadCount: number,
    hasAnnounced: boolean,
    hasScraped: boolean,
    host: string,
    id: number,
    isBackup: boolean,
    lastAnnouncePeerCount: number,
    lastAnnounceResult: string,
    lastAnnounceStartTime: number,
    lastAnnounceSucceeded: boolean,
    lastAnnounceTime: number,
    lastAnnounceTimedOut: boolean,
    lastScrapeResult: string,
    lastScrapeStartTime: number,
    lastScrapeSucceeded: boolean,
    lastScrapeTime: number,
    lastScrapeTimedOut: number,
    leecherCount: number,
    nextAnnounceTime: number,
    nextScrapeTime: number,
    scrape: string,
    scrapeState: number,
    seederCount: number,
    tier: number
}

export interface ITracker {
    announce: string,
    id: number,
    scrape: string,
    tier: number
}

export interface ITorrent {
    activityDate: number,
    addedDate: number,
    bandwidthPriority: number,
    comment: string,
    corruptEver: number,
    creator: string,
    dateCreated: number,
    desiredAvailable: number,
    doneDate: number,
    downloadDir: string,
    downloadLimit: number,
    downloadLimited: false,
    downloadedEver: number,
    error: number,
    errorString: string,
    eta: number,
    fileStats: [
        {
            bytesCompleted: number,
            priority: number,
            wanted: boolean
        },
        {
            bytesCompleted: number,
            priority: number,
            wanted: boolean
        }
        ],
    files: [
        {
            bytesCompleted: number,
            length: number,
            name: string
        },
        {
            bytesCompleted: number,
            length: number,
            name: string
        }
        ],
    hashString: string,
    haveUnchecked: number,
    haveValid: number,
    honorsSessionLimits: boolean,
    id: number,
    isFinished: boolean,
    isPrivate: boolean,
    leftUntilDone: number,
    magnetLink: string
    manualAnnounceTime: number,
    maxConnectedPeers: number,
    metadataPercentComplete: number,
    name: string,
    "peer-limit": number,
    peers: Array<any>,
    peersConnected: number,
    peersFrom: {
        fromCache: number,
        fromDht: number,
        fromIncoming: number,
        fromLpd: number,
        fromLtep: number,
        fromPex: number,
        fromTracker: number
    },
    peersGettingFromUs: number,
    peersSendingToUs: number,
    percentDone: number,
    pieceCount: number,
    pieceSize: number,
    pieces: string,
    priorities: Array<number>,//todo need to investigate
    rateDownload: number,
    rateUpload: number,
    recheckProgress: number,
    seedIdleLimit: number,
    seedIdleMode: number,
    seedRatioLimit: number,
    seedRatioMode: number,
    sizeWhenDone: number,
    startDate: number,
    status: number,
    torrentFile: string,
    totalSize: number,
    trackerStats: Array<ITrackerStat>,
    trackers: Array<ITracker>,
    uploadLimit: number,
    uploadLimited: boolean,
    uploadRatio: number,
    uploadedEver: number,
    wanted: Array<number>, //todo need to investigate
    webseeds: Array<any>,//todo need to investigate
    webseedsSendingToUs: number
}

export interface IRPCResponse {
    torrents?: Array<ITorrent>
}

export interface IAddConfig {
    /**
     * pointer to a string of one or more cookies.
     */
    cookies?:string,
    /**
     * path to download the torrent to
     */
    "download-dir"?:string,
    /**
     * filename or URL of the .torrent file
     */
    filename?:string,
    /**
     * base64-encoded .torrent content
     */
    metainfo?:string,
    /**
     * if true, don't start the torrent
     */
    paused?:boolean,
    /**
     * maximum number of peers
     */
    "peer-limit"?:number,
    /**
     * torrent's bandwidth tr_priority_t
     */
    bandwidthPriority?:number,
    /**
     * Ids of file(s) to download
     */
    "files-wanted"?:Array<number>,
    /**
     * Ids of file(s) to not download
     */
    "files-unwanted"?:Array<number>,
    /**
     * Ids of high-priority file(s)
     */
    "priority-high"?:Array<number>,
    /**
     * Ids of low-priority file(s)
     */
    "priority-low"?:Array<number>,
    /**
     * Ids of normal-priority file(s)
     */
    "priority-normal"?:Array<number>,
}

interface ICallback {
    (err?,message?) : any
}

const TransmissionHeaderSession = "X-Transmission-Session-Id";

interface pollJob {
    torrentId:number,
    callBack:Array<ICallback>,
    desiredState:TransmissionStatus
}

export default class Transmission {
    private readonly url: string;
    private key: string;
    readonly status: {};
    readonly authHeader: string;
    private methods: { torrents: { stop: string; start: string; startNow: string; verify: string; reannounce: string; set: string; setTypes: { bandwidthPriority: boolean; downloadLimit: boolean; downloadLimited: boolean; "files-wanted": boolean; "files-unwanted": boolean; honorsSessionLimits: boolean; ids: boolean; location: boolean; "peer-limit": boolean; "priority-high": boolean; "priority-low": boolean; "priority-normal": boolean; seedRatioLimit: boolean; seedRatioMode: boolean; uploadLimit: boolean; uploadLimited: boolean }; add: string; addTypes: { "download-dir": boolean; filename: boolean; metainfo: boolean; paused: boolean; "peer-limit": boolean; "files-wanted": boolean; "files-unwanted": boolean; "priority-high": boolean; "priority-low": boolean; "priority-normal": boolean }; rename: string; remove: string; removeTypes: { ids: boolean; "delete-local-data": boolean }; location: string; locationTypes: { location: boolean; ids: boolean; move: boolean }; get: string; fields: string[] }; session: { stats: string; get: string; set: string; setTypes: { "start-added-torrents": boolean; "alt-speed-down": boolean; "alt-speed-enabled": boolean; "alt-speed-time-begin": boolean; "alt-speed-time-enabled": boolean; "alt-speed-time-end": boolean; "alt-speed-time-day": boolean; "alt-speed-up": boolean; "blocklist-enabled": boolean; "dht-enabled": boolean; encryption: boolean; "download-dir": boolean; "peer-limit-global": boolean; "peer-limit-per-torrent": boolean; "pex-enabled": boolean; "peer-port": boolean; "peer-port-random-on-start": boolean; "port-forwarding-enabled": boolean; seedRatioLimit: boolean; seedRatioLimited: boolean; "speed-limit-down": boolean; "speed-limit-down-enabled": boolean; "speed-limit-up": boolean; "speed-limit-up-enabled": boolean } }; other: { blockList: string; port: string; freeSpace: string } };

    path: string = '/transmission/rpc';
    host: string = "localhost";
    port: number = 9091;
    ssl: boolean = false;
    username: string = "";
    password: string = "";
    private axiosInstance: AxiosInstance;

    /**
     * is the client polling ?
     */
    polling: boolean = false;
    pollJobs : Array<pollJob> = [];
    private pollInterval: number = 1000;
    private pollTimeout: NodeJS.Timer;

    /**
     * Available options:
     * path
     * host
     * port
     * ssl (boolean)
     * username
     * password
     *
     * @param {TransmissionConfig} options
     */
    constructor(options: TransmissionConfig = {}) {
        if (options.path)
            this.path = options.path;
        if (options.host)
            this.host = options.host;
        if (options.port)
            this.port = options.port;
        if (options.ssl)
            this.ssl = options.ssl;
        if (options.username)
            this.username = options.username;
        if (options.password)
            this.password = options.password;

        this.url = `http${this.ssl && "s"}://${this.host}`;
        if (this.port)
            this.url += `:${this.port}`;

        if (this.path)
            this.url += `${this.path}`;

        this.key = null;

        this.axiosInstance = axios.create({
            baseURL: this.url,
            auth: {
                username: this.username,
                password: this.password
            }
        });

        this.methods = {
            torrents: {
                stop: 'torrent-stop',
                start: 'torrent-start',
                startNow: 'torrent-start-now',
                verify: 'torrent-verify',
                reannounce: 'torrent-reannounce',
                set: 'torrent-set',
                setTypes: {
                    'bandwidthPriority': true,
                    'downloadLimit': true,
                    'downloadLimited': true,
                    'files-wanted': true,
                    'files-unwanted': true,
                    'honorsSessionLimits': true,
                    'ids': true,
                    'location': true,
                    'peer-limit': true,
                    'priority-high': true,
                    'priority-low': true,
                    'priority-normal': true,
                    'seedRatioLimit': true,
                    'seedRatioMode': true,
                    'uploadLimit': true,
                    'uploadLimited': true
                },
                add: 'torrent-add',
                addTypes: {
                    'download-dir': true,
                    'filename': true,
                    'metainfo': true,
                    'paused': true,
                    'peer-limit': true,
                    'files-wanted': true,
                    'files-unwanted': true,
                    'priority-high': true,
                    'priority-low': true,
                    'priority-normal': true
                },
                rename: 'torrent-rename-path',
                remove: 'torrent-remove',
                removeTypes: {
                    'ids': true,
                    'delete-local-data': true
                },
                location: 'torrent-set-location',
                locationTypes: {
                    'location': true,
                    'ids': true,
                    'move': true
                },
                get: 'torrent-get',
                fields: ['activityDate', 'addedDate', 'bandwidthPriority', 'comment', 'corruptEver', 'creator', 'dateCreated', 'desiredAvailable', 'doneDate', 'downloadDir', 'downloadedEver', 'downloadLimit', 'downloadLimited', 'error', 'errorString', 'eta', 'files', 'fileStats', 'hashString', 'haveUnchecked', 'haveValid', 'honorsSessionLimits', 'id', 'isFinished', 'isPrivate', 'leftUntilDone', 'magnetLink', 'manualAnnounceTime', 'maxConnectedPeers', 'metadataPercentComplete', 'name', 'peer-limit', 'peers', 'peersConnected', 'peersFrom', 'peersGettingFromUs', 'peersKnown', 'peersSendingToUs', 'percentDone', 'pieces', 'pieceCount', 'pieceSize', 'priorities', 'rateDownload', 'rateUpload', 'recheckProgress', 'seedIdleLimit', 'seedIdleMode', 'seedRatioLimit', 'seedRatioMode', 'sizeWhenDone', 'startDate', 'status', 'trackers', 'trackerStats', 'totalSize', 'torrentFile', 'uploadedEver', 'uploadLimit', 'uploadLimited', 'uploadRatio', 'wanted', 'webseeds', 'webseedsSendingToUs']
            },
            session: {
                stats: 'session-stats',
                get: 'session-get',
                set: 'session-set',
                setTypes: {
                    'start-added-torrents': true,
                    'alt-speed-down': true,
                    'alt-speed-enabled': true,
                    'alt-speed-time-begin': true,
                    'alt-speed-time-enabled': true,
                    'alt-speed-time-end': true,
                    'alt-speed-time-day': true,
                    'alt-speed-up': true,
                    'blocklist-enabled': true,
                    'dht-enabled': true,
                    'encryption': true,
                    'download-dir': true,
                    'peer-limit-global': true,
                    'peer-limit-per-torrent': true,
                    'pex-enabled': true,
                    'peer-port': true,
                    'peer-port-random-on-start': true,
                    'port-forwarding-enabled': true,
                    'seedRatioLimit': true,
                    'seedRatioLimited': true,
                    'speed-limit-down': true,
                    'speed-limit-down-enabled': true,
                    'speed-limit-up': true,
                    'speed-limit-up-enabled': true
                }
            },
            other: {
                blockList: 'blocklist-update',
                port: 'port-test',
                freeSpace: 'free-space'
            }
        }
    }


    private startPolling(id: number, desiredState: TransmissionStatus, cb: ICallback) {
        console.log(`add ${id} to pollJob`);
        let pollJobs : Array<pollJob>;
        //check if same job exist
        if(this.pollJobs.find(job=>job.torrentId===id&&job.desiredState===desiredState)){
            pollJobs =  this.pollJobs.map(job=>{
                if(job.torrentId===id&&job.desiredState===desiredState)
                    job.callBack.push(cb);

                return job;
            })
        }
        else{
            pollJobs = [
                ...this.pollJobs,
                {
                    torrentId:id,
                    callBack:[cb],
                    desiredState
                }
            ]
        }

        this.pollJobs = pollJobs;

        console.log(`PollJobs : ${this.pollJobs.map(job=>job.torrentId).join(", ")}`);

        if(!this.polling){
            this.polling = true;
            this.poll();
        }
    }

    async poll(){
        let ids = unique(this.pollJobs.map(job=>job.torrentId));

        console.log(`poll with ids : ${ids.join(", ")}`);
        let torrents = await this.get(ids);

        //re add only jobs with unmeeted desired state
        this.pollJobs = this.pollJobs.filter(job=>{
            let isOk = false;
            let torrentFound = false;
            //check on add torrents coming from the request
            torrents.torrents.forEach(torrent=>{
               if(torrent.id===job.torrentId){
                   torrentFound=true;
                    if(torrent.status===job.desiredState){
                        job.callBack.forEach(cb=>new Promise((resolve, reject) => {cb(null, torrent)}));
                        isOk = true;
                    }
               }
           });
            return isOk;
        });

        if(this.pollJobs.length>0)
            this.pollTimeout = setTimeout(()=> this.poll(), this.pollInterval);
        else
            this.polling = false;
    }

    /**
     * Makes a call to the Transmission server
     *
     * @param {Object} query The query to send the server
     * @returns {Promise}
     */
    async callServer(query): Promise<IRPCResponse> {
        try{
            console.log("post to Transmission");
            return <IRPCResponse>(await this.axiosInstance.request({
                data: query,
                method:"post"
            })).data.arguments;
        }
        catch (err) {
            if (err.response && err.response.status === 409) {
                //add the header
                this.axiosInstance.defaults.headers[TransmissionHeaderSession] = err.response.headers['x-transmission-session-id'];
                return await this.callServer(query);
            }
            else{
                console.error(err);
                throw new Error(err.response.statusText);
            }
        }
    }

    /**
     * Sets torrent properties
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @param {Object} options The options to set on the server
     * @returns {Promise}
     */
    set(ids, options = {}) {
        return new Promise((resolve, reject) => {
            if (typeof options !== 'object') {
                return reject(new Error('Arguments mismatch for "bt.set"'))
            }

            ids = Array.isArray(ids) ? ids : [ids];
            const args = {ids};

            for (const key of Object.keys(options)) {
                args[key] = options[key]
            }

            this.callServer({
                arguments: args,
                method: this.methods.torrents.set,
                tag: uuid()
            })
                .then(res => resolve(res))
                .catch(err => reject(err))
        })
    }

    /**
     * An alias for `addUrl()`
     *
     * @param {String} path The magnet url of the torrent
     * @param {Object} options Optional options for the new torrent
     * @returns {Promise}
     */
    add(path, options: IAddConfig = {}) {
        return this.addUrl(path, options)
    }

    /**
     * Adds a torrent from a file path to a torrent file
     *
     * @param {String} filePath The local file path to a torrent file
     * @param {Object} options Optional options for the new torrent
     * @returns {Promise}
     */
    addFile(filePath, options: IAddConfig = {}) {
        const readFile = () => {
            return new Promise((resolve, reject) => {
                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        return reject(err)
                    }

                    resolve(new Buffer(data).toString('base64'))
                })
            })
        };

        return readFile().then(res => this.addBase64(res, options))
    }

    /**
     * Adds a torrent from the base64 contents of a torrent file
     *
     * @param {String} fileb64 A base64 encoded torrent file
     * @param {Object} options Optional options for the new torrent
     * @returns {Promise}
     */
    addBase64(fileb64, options: IAddConfig = {}) {
        return this.addTorrentDataSrc({metainfo: fileb64}, options)
    }

    /**
     * Adds a torrent from a magnet url
     *
     * @param {String} url The magnet url of the torrent
     * @param {Object} options Optional options for the new torrent
     * @returns {Promise}
     */
    addUrl(url: string, options: IAddConfig = {}) {
        return this.addTorrentDataSrc({filename: url}, options)
    }

    /**
     * Adds a new torrent from a variety of sources
     *
     * @param {Object} args The data needed to add a new torrent file
     * @param {Object} options Optional options for the new torrent
     * @returns {Promise}
     */
    addTorrentDataSrc(args, options: IAddConfig = {}) {
        return new Promise((resolve, reject) => {
            if (typeof options !== 'object') {
                return reject(new Error('Arguments mismatch for "bt.add"'))
            }

            for (const key of Object.keys(options)) {
                args[key] = options[key]
            }

            this.callServer({
                arguments: args,
                method: this.methods.torrents.add,
                tag: uuid()
            }).then(res => {
                const torrent = res['torrent-duplicate'] ? res['torrent-duplicate'] : res['torrent-added'];
                resolve(torrent)
            }).catch(err => reject(err))
        })
    }

    /**
     * Removes a torrent from Transmission with the option to delete files as well
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @param {Boolean} deleteLocalData Whether to delete local files
     */
    remove(ids: number | Array<number>, deleteLocalData = false): Promise<IRPCResponse> {
        const options = {
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids],
                'delete-local-data': deleteLocalData
            },
            method: this.methods.torrents.remove,
            tag: uuid()
        };

        return this.callServer(options)
    }

    /**
     * Move a torrent from one location to another
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @param {String} location The new torrent location
     * @param {Boolean} move If true, move from previous location
     * @returns {Promise}
     */
    move(ids: number | Array<number>, location: string, move: boolean = false): Promise<IRPCResponse> {
        const options = {
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids],
                location: location,
                move: move
            },
            method: this.methods.torrents.location,
            tag: uuid()
        };

        return this.callServer(options)
    }

    /**
     * Rename a file or folder
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @param {String} path The path to the file or folder that will be renamed, relative to the root torrent folder
     * @param {String} name The file or folder's new name
     * @returns {Promise}
     */
    rename(ids: number | Array<number>, path: string, name: string) {
        const options = {
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids],
                path: path,
                name: name
            },
            method: this.methods.torrents.rename,
            tag: uuid()
        };

        return this.callServer(options)
    }

    /**
     * Get information on a torrent or torrents
     *
     * @param {number|Array} ids An array of ids, a single id, or nothing for all torrents
     * @param {Array} fields The fields to return from Transmission about the torrent(s)
     * @returns {Promise}
     */
    get(ids?: number | Array<number>, fields = []): Promise<IRPCResponse> {
        if (!Array.isArray(fields)) {
            throw new Error(`The fields parameter must be an array`)
        }

        const options = {
            arguments: {
                fields: fields.length > 0 ? fields : this.methods.torrents.fields,
                ids: Array.isArray(ids) ? ids : [ids]
            },
            method: this.methods.torrents.get,
            tag: uuid()
        };

        if (!ids) {
            delete options.arguments.ids
        }

        return this.callServer(options)
    }

    /**
     * Polls the server and waits for the target state
     * STOPPED
     * CHECK_WAIT
     * CHECK
     * DOWNLOAD_WAIT
     * DOWNLOAD
     * SEED_WAIT
     * SEED
     * ISOLATED
     *
     * @param {number} id The torrent id
     * @param {TransmissionStatus} desiredState The state for which to wait
     * @returns {Promise}
     */
    waitForState(id: number, desiredState: TransmissionStatus): Promise<ITorrent> {

        //start polling
        return new Promise((resolve, reject) => {
            this.startPolling(id,desiredState,(err, torrent)=>{
                if(err) return reject(err);
                else resolve(torrent);
            });
        })
    }

    /**
     * Retrieves peer information for the given torrent(s) id
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    peers(ids?: number | Array<number>): Promise<IRPCResponse> {
        return this.get(ids, ['peers', 'hashString', 'id'])
    }

    /**
     * Retrieves file information for the given torrent(s) id
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    files(ids?: number | Array<number>): Promise<IRPCResponse> {
        return this.get(ids, ['files', 'fileStats', 'hashString', 'id'])
    }

    /**
     * Returns time related information for the given torrent(s) id
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    fast(ids?: number | Array<number>): Promise<IRPCResponse> {
        return this.get(ids, ['id', 'error', 'errorString', 'eta', 'isFinished', 'isStalled', 'leftUntilDone', 'metadataPercentComplete', 'peersConnected', 'peersGettingFromUs', 'peersSendingToUs', 'percentDone', 'queuePosition', 'rateDownload', 'rateUpload', 'recheckProgress', 'seedRatioMode', 'seedRatioLimit', 'sizeWhenDone', 'status', 'trackers', 'uploadedEver', 'uploadRatio'])
    }

    /**
     * Stop downloading and seeding the given torrent(s)
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    stop(ids?: number | Array<number>): Promise<IRPCResponse> {
        if (!ids) {
            return this.callServer({method: this.methods.torrents.stop})
        }

        return this.callServer({
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids]
            },
            method: this.methods.torrents.stop,
            tag: uuid()
        })
    }

    /**
     * Stops downloading and seeding all torrents
     *
     * @returns {Promise}
     */
    stopAll() {
        return this.stop()
    }

    /**
     * Start downloading and seeding the given torrent(s)
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    start(ids?: number | Array<number>): Promise<IRPCResponse> {
        if (!ids) {
            return this.callServer({method: this.methods.torrents.start})
        }

        return this.callServer({
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids]
            },
            method: this.methods.torrents.start,
            tag: uuid()
        })
    }

    /**
     * Starts downloading and seeding all torrents
     *
     * @returns {Promise}
     */
    startAll() {
        return this.start()
    }

    /**
     * Start downloading and seeding the given torrent(s) right now
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    startNow(ids: number | Array<number>) {
        return this.callServer({
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids]
            },
            method: this.methods.torrents.startNow,
            tag: uuid()
        })
    }

    /**
     * Verifies currently downloaded pieces
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    verify(ids: number | Array<number>) {
        return this.callServer({
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids]
            },
            method: this.methods.torrents.verify,
            tag: uuid()
        })
    }

    /**
     * Reannounce torrent availability
     *
     * @param {number|Array} ids An array of ids or just a single id of the torrent file(s)
     * @returns {Promise}
     */
    reannounce(ids: number | Array<number>): Promise<IRPCResponse> {
        return this.callServer({
            arguments: {
                ids: Array.isArray(ids) ? ids : [ids]
            },
            method: this.methods.torrents.reannounce,
            tag: uuid()
        })
    }

    /**
     * Gets all the fields for all torrents
     * Just syntactic sugar around get()
     *
     * @returns {Promise}
     */
    all(): Promise<IRPCResponse> {
        return this.get()
    }

    /**
     * Retrieves all the active torrents
     *
     * @returns {Promise}
     */
    active(): Promise<IRPCResponse> {
        return this.callServer({
            arguments: {
                fields: this.methods.torrents.fields,
                ids: 'recently-active'
            },
            method: this.methods.torrents.get,
            tag: uuid()
        })
    }

    /**
     * Gets or sets Transmission session data
     *
     * @param {Object} settings The settings to set for Transmission
     * @returns {Promise}
     */
    session(settings): Promise<IRPCResponse> {
        if (!settings) {
            return this.callServer({
                method: this.methods.session.get,
                tag: uuid()
            })
        }

        if (typeof settings !== 'object') {
            throw new Error('The parameter must be an object')
        }

        for (const key of Object.keys(settings)) {
            if (!this.methods.session.setTypes[key]) {
                throw new Error(`Cant set type ${key}`)
            }
        }

        return this.callServer({
            arguments: settings,
            method: this.methods.session.set,
            tag: uuid()
        })
    }

    /**
     * Gets the session stats
     *
     * @returns {Promise}
     */
    sessionStats(): Promise<IRPCResponse> {
        return this.callServer({
            method: this.methods.session.stats,
            tag: uuid()
        })
    }

    /**
     * Checks how much free space is available in a specified folder
     *
     * @param {String} path The path to the folder
     * @returns {Promise}
     */
    freeSpace(path: string): Promise<IRPCResponse> {
        return this.callServer({
            arguments: {path},
            method: this.methods.other.freeSpace
        })
    }
}
