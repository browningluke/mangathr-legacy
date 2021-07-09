import { Sequelize } from "sequelize";
import { defineManga } from "./manga.model";

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database/database.sqlite',
    logging: false,
});

const modelDefiners = [
    defineManga
]

modelDefiners.forEach((item) => {
    item(sequelize);
})

export { sequelize };