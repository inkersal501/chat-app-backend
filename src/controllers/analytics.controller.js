import { analyticsService } from "../services/index.js";

const getData = async (req, res) => {
    const userId = req.user.id;
    try {
        const data = await analyticsService.getData(userId);
        res.status(200).send({...data});
    } catch (error) {
        res.status(500).send({msg: error.message});
    }
};

export default {
    getData
};