export class SoftDeleteNotInitializedException extends Error {
  constructor() {
    super(
      "SoftDeleteModule has not been initialized. Make sure SoftDeleteModule.forRoot() is imported.",
    );
    this.name = "SoftDeleteNotInitializedException";
  }
}
