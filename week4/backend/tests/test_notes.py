def test_create_and_list_notes(client):
    payload = {"title": "Test", "content": "Hello world"}
    r = client.post("/notes/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["title"] == "Test"

    r = client.get("/notes/")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1

    r = client.get("/notes/search/")
    assert r.status_code == 200

    r = client.get("/notes/search/", params={"q": "Hello"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1


def test_search_notes_is_case_insensitive(client):
    client.post("/notes/", json={"title": "Planning", "content": "Release checklist"})

    r = client.get("/notes/search/", params={"q": "release"})

    assert r.status_code == 200
    items = r.json()
    assert [item["title"] for item in items] == ["Planning"]


def test_update_and_delete_note(client):
    r = client.post("/notes/", json={"title": "Draft", "content": "old content"})
    assert r.status_code == 201
    note_id = r.json()["id"]

    r = client.put(f"/notes/{note_id}", json={"title": "Final", "content": "new content"})
    assert r.status_code == 200
    assert r.json()["title"] == "Final"
    assert r.json()["content"] == "new content"

    r = client.delete(f"/notes/{note_id}")
    assert r.status_code == 204

    r = client.get(f"/notes/{note_id}")
    assert r.status_code == 404


def test_note_validation_rejects_blank_title(client):
    r = client.post("/notes/", json={"title": "", "content": "Has content"})

    assert r.status_code == 422
