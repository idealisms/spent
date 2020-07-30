export class FileWatcher {
  private watcher: any;
  private waitTimerId: number = 0;
  private readonly WAIT_MS = 100;

  constructor() {
    Deno.run({
      cmd: ['yarn', 'watch'],
    });
    this.watcher = Deno.watchFs('./build', {recursive: true});
  }

  public async listen() {
    for await (const event of this.watcher) {
      for (const path of event.paths) {
        console.log(performance.now(), path);
        clearTimeout(this.waitTimerId);
        this.waitTimerId = setTimeout(() => {
          console.log(performance.now(), 'webpack finished!');
          // TODO: Tell the client to reload.
        }, this.WAIT_MS);
      }
    }
  }
}
