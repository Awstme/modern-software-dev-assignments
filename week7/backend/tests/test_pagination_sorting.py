def _create_note(client, title: str, content: str = "Body") -> dict:
    response = client.post("/notes/", json={"title": title, "content": content})
    assert response.status_code == 201, response.text
    return response.json()


def _create_action_item(client, description: str, completed: bool = False) -> dict:
    response = client.post("/action-items/", json={"description": description})
    assert response.status_code == 201, response.text
    item = response.json()
    if completed:
        response = client.put(f"/action-items/{item['id']}/complete")
        assert response.status_code == 200, response.text
        item = response.json()
    return item


def _create_project(client, name: str) -> dict:
    response = client.post("/projects/", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()


def test_notes_pagination_and_title_sorting(client):
    for title in ["Charlie", "Alpha", "Bravo"]:
        _create_note(client, title)

    response = client.get("/notes/", params={"sort": "title", "skip": 1, "limit": 1})

    assert response.status_code == 200
    assert [note["title"] for note in response.json()] == ["Bravo"]


def test_notes_descending_id_sorting(client):
    first = _create_note(client, "First")
    second = _create_note(client, "Second")

    response = client.get("/notes/", params={"sort": "-id", "limit": 2})

    assert response.status_code == 200
    assert [note["id"] for note in response.json()] == [second["id"], first["id"]]


def test_action_items_pagination_and_description_sorting(client):
    for description in ["Write summary", "Archive notes", "Build dashboard"]:
        _create_action_item(client, description)

    response = client.get(
        "/action-items/",
        params={"sort": "description", "skip": 1, "limit": 1},
    )

    assert response.status_code == 200
    assert [item["description"] for item in response.json()] == ["Build dashboard"]


def test_action_items_sorting_respects_completed_filter(client):
    _create_action_item(client, "Open task")
    done_alpha = _create_action_item(client, "Alpha done", completed=True)
    done_beta = _create_action_item(client, "Beta done", completed=True)

    response = client.get(
        "/action-items/",
        params={"completed": True, "sort": "-description"},
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [done_beta["id"], done_alpha["id"]]


def test_projects_pagination_and_name_sorting(client):
    for name in ["Zebra", "Alpha", "Middle"]:
        _create_project(client, name)

    response = client.get("/projects/", params={"sort": "name", "skip": 1, "limit": 1})

    assert response.status_code == 200
    assert [project["name"] for project in response.json()] == ["Middle"]


def test_projects_reject_invalid_pagination_and_sorting(client):
    response = client.get("/projects/", params={"skip": -1})
    assert response.status_code == 422

    response = client.get("/projects/", params={"limit": 0})
    assert response.status_code == 422

    response = client.get("/projects/", params={"limit": 201})
    assert response.status_code == 422

    response = client.get("/projects/", params={"sort": "not_a_column"})
    assert response.status_code == 422
    assert "Invalid sort field" in response.json()["detail"]


def test_project_action_items_pagination_and_sorting(client):
    project = _create_project(client, "Migration")
    for description in ["Plan rollout", "Run migration", "Verify results"]:
        response = client.post(
            "/action-items/",
            json={"description": description, "project_id": project["id"]},
        )
        assert response.status_code == 201, response.text

    response = client.get(
        f"/projects/{project['id']}/action-items",
        params={"sort": "description", "skip": 1, "limit": 1},
    )

    assert response.status_code == 200
    assert [item["description"] for item in response.json()] == ["Run migration"]


def test_project_action_items_reject_invalid_pagination_and_sorting(client):
    project = _create_project(client, "Invalid project action filters")

    response = client.get(f"/projects/{project['id']}/action-items", params={"skip": -1})
    assert response.status_code == 422

    response = client.get(f"/projects/{project['id']}/action-items", params={"limit": 0})
    assert response.status_code == 422

    response = client.get(f"/projects/{project['id']}/action-items", params={"limit": 201})
    assert response.status_code == 422

    response = client.get(
        f"/projects/{project['id']}/action-items",
        params={"sort": "not_a_column"},
    )
    assert response.status_code == 422
    assert "Invalid sort field" in response.json()["detail"]
