module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Allow comparison operators in Vue template expressions",
      category: "Possible Errors",
      recommended: true
    },
    fixable: null,
    schema: []
  },
  create(context) {
    function hasComparisonOperator(expr) {
      switch (expr?.type) {
        case "LogicalExpression":
          return hasComparisonOperator(expr.left) || hasComparisonOperator(expr.right)
        case "BinaryExpression":
          if (expr.operator === "<" || expr.operator === ">")
            return true
        default:
          return false
      }
    }

    const sourceCode = context.sourceCode || context.getSourceCode()
    const parserServices = sourceCode?.parserServices || context.parserServices

    if (!parserServices || typeof parserServices.defineTemplateBodyVisitor !== "function")
      return {}

    const templateVisitor = parserServices.defineTemplateBodyVisitor(
      {
        VAttribute(node) {
          if (node.directive && hasComparisonOperator(node.value?.expression))
            return
        }
      },
      {}
    )

    return templateVisitor
  }
}
