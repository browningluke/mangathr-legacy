import { DataTypes, Sequelize, Model, Optional } from 'sequelize';
import { PLUGINS } from "../../plugins";
import { MangaUpdate } from "../../types/database";

/*
    Extended Model Types
 */

interface MangaAttributes extends MangaUpdate {
    _id: number;
}

interface MangaCreationAttributes extends Optional<MangaAttributes, "_id"> {}

export class MangaSchema extends Model<MangaAttributes, MangaCreationAttributes>
    implements MangaAttributes {
    public _id!: number;
    public chapters!: number[];
    public id!: string;
    public plugin!: PLUGINS;
    public title!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}
