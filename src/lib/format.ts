import "jspdf-autotable";

export const formatNumber = (pNumero: number) => {
  const cNumero = parseFloat(pNumero.toString().replaceAll(",", ""));

  return cNumero.toLocaleString("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
