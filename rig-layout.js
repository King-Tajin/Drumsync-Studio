export function wireLayoutEvents() {
  const stage = document.getElementById("rigStage");
  const select = document.getElementById("rigLayoutSelect");

  stage.dataset.layout = select.value;
  select.addEventListener("change", () => {
    stage.dataset.layout = select.value;
  });
}
