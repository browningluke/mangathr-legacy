import { Sequelize } from "sequelize";
import { defineManga } from "./manga.model";

import { SQLITE_STORAGE } from "@core/constants";

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: SQLITE_STORAGE,
    logging: false,
});

const modelDefiners = [
    defineManga
]

modelDefiners.forEach((item) => {
    item(sequelize);
})

export { sequelize };