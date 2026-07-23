import {UAParser} from "ua-parser-js";

const deviceInfo = (req)=>{
    const parser = new UAParser(req.headers["user-agent"]);
    const result = parser.getResult();
    return result;
};

export default deviceInfo;
