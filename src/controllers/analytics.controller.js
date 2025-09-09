import { analyticsService } from "../services/index.js";

const getData = async (req, res) => {
    const userId = req.user._id;
    try {
        const data = await analyticsService.getData(userId);
        res.json({...data});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

export default {
    getData
};