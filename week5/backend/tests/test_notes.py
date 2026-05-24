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


def test_update_note(client):
    r = client.post("/notes/", json={"title": "Draft", "content": "Original"})
    assert r.status_code == 201, r.text
    note = r.json()

    r = client.put(
        f"/notes/{note['id']}",
        json={"title": "Updated", "content": "Edited content"},
    )
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated["id"] == note["id"]
    assert updated["title"] == "Updated"
    assert updated["content"] == "Edited content"


def test_update_note_validation_error(client):
    r = client.post("/notes/", json={"title": "Draft", "content": "Original"})
    assert r.status_code == 201, r.text
    note = r.json()

    r = client.put(f"/notes/{note['id']}", json={"title": "", "content": "Still content"})
    assert r.status_code == 422


def test_update_missing_note_returns_404(client):
    r = client.put("/notes/999", json={"title": "Missing", "content": "Nope"})
    assert r.status_code == 404


def test_delete_note(client):
    r = client.post("/notes/", json={"title": "Delete me", "content": "Temporary"})
    assert r.status_code == 201, r.text
    note = r.json()

    r = client.delete(f"/notes/{note['id']}")
    assert r.status_code == 204

    r = client.get(f"/notes/{note['id']}")
    assert r.status_code == 404


def test_delete_missing_note_returns_404(client):
    r = client.delete("/notes/999")
    assert r.status_code == 404
