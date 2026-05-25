def test_create_list_and_patch_notes(client):
    payload = {"title": "Test", "content": "Hello world"}
    r = client.post("/notes/", json=payload)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["title"] == "Test"
    assert "created_at" in data and "updated_at" in data

    r = client.get("/notes/")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1

    r = client.get("/notes/", params={"q": "Hello", "limit": 10, "sort": "-created_at"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1

    note_id = data["id"]
    r = client.patch(f"/notes/{note_id}", json={"title": "Updated"})
    assert r.status_code == 200
    patched = r.json()
    assert patched["title"] == "Updated"


def test_note_validation_errors(client):
    r = client.post("/notes/", json={"title": "   ", "content": "Body"})
    assert r.status_code == 422

    r = client.post("/notes/", json={"title": "Valid", "content": "\n\t"})
    assert r.status_code == 422

    r = client.get("/notes/", params={"skip": -1})
    assert r.status_code == 422

    r = client.get("/notes/", params={"limit": 0})
    assert r.status_code == 422

    r = client.get("/notes/", params={"sort": "not_a_column"})
    assert r.status_code == 422
    assert "Invalid sort field" in r.json()["detail"]


def test_get_and_delete_note(client):
    r = client.post("/notes/", json={"title": "Keep", "content": "Readable"})
    assert r.status_code == 201
    note_id = r.json()["id"]

    r = client.get(f"/notes/{note_id}")
    assert r.status_code == 200
    assert r.json()["title"] == "Keep"

    r = client.delete(f"/notes/{note_id}")
    assert r.status_code == 204
    assert r.content == b""

    r = client.get(f"/notes/{note_id}")
    assert r.status_code == 404

    r = client.delete(f"/notes/{note_id}")
    assert r.status_code == 404
