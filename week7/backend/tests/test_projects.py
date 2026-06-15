def test_create_project_and_assign_action_items(client):
    r = client.post(
        "/projects/",
        json={"name": "Launch", "description": "Track launch work"},
    )
    assert r.status_code == 201, r.text
    project = r.json()
    assert project["name"] == "Launch"

    r = client.post(
        "/action-items/",
        json={"description": "Publish release notes", "project_id": project["id"]},
    )
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["project_id"] == project["id"]

    r = client.get(f"/projects/{project['id']}/action-items")
    assert r.status_code == 200
    project_items = r.json()
    assert len(project_items) == 1
    assert project_items[0]["description"] == "Publish release notes"

    r = client.get("/action-items/", params={"project_id": project["id"]})
    assert r.status_code == 200
    assert [item["id"] for item in r.json()] == [item["id"]]

    r = client.patch(f"/action-items/{item['id']}", json={"project_id": None})
    assert r.status_code == 200
    assert r.json()["project_id"] is None


def test_duplicate_project_names_are_rejected(client):
    payload = {"name": "Operations"}
    assert client.post("/projects/", json=payload).status_code == 201

    r = client.post("/projects/", json=payload)

    assert r.status_code == 409
    assert r.json()["detail"] == "Project name already exists"


def test_action_item_rejects_missing_project(client):
    r = client.post(
        "/action-items/",
        json={"description": "Prepare rollout checklist", "project_id": 404},
    )

    assert r.status_code == 404
    assert r.json()["detail"] == "Project not found"
