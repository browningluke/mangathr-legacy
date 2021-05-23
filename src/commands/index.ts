enum Command {
    Download = "download",
    Register = "register",
    List = "list",
    Update = "update"
}

export * from './download';
export * from './register';
export * from './update';
export * from './list';
export { Command };