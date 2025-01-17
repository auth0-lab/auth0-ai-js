export function resume(ifn, transactionId, context, args) {
  console.log("resume....");
  console.log(transactionId);
  console.log(context);
  console.log(args);

  const a = [context].concat(args);
  console.log(a);

  return ifn(...a);
}
