export function getControllerResult(
  controllerMap: WeakMap<Object, Record<string, any>>,
  _: Object,
  key: any,
  v: any
) {
  let controller = controllerMap.get(_);

  if (!controller) {
    controllerMap.set(_, (controller = new Map()));
  }

  let result = controller?.get(key);
  
  if (!result) {
    controller.set(key, (result = v));
  }
  return { controller, result };
}
